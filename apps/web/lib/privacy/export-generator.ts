/**
 * TradeLens Zero-Dependency PKZIP Archive Generator.
 *
 * Conforms to PKWARE APPNOTE.TXT specification for ZIP archives.
 * Uses Node.js native zlib for DEFLATE compression and CRC-32 calculation.
 * Produces clean, standards-compliant ZIP files compatible with Windows Explorer,
 * macOS Archive Utility, Linux unzip, and standard programmatic extractors.
 */

import zlib from "zlib";
import { formatCsv } from "./export-sanitizer";

export interface ZipFileInput {
  name: string;
  content: string | Buffer;
}

/**
 * Converts a JS Date into MS-DOS date and time format (2 bytes each).
 */
function toDosDateTime(date: Date): { dosTime: number; dosDate: number } {
  const dosTime =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((Math.floor(date.getSeconds() / 2)) & 0x1f);

  const year = Math.max(1980, date.getFullYear());
  const dosDate =
    (((year - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f);

  return { dosTime, dosDate };
}

/**
 * Builds a valid ZIP archive buffer from a list of files without third-party dependencies.
 */
export function createZipArchive(files: ZipFileInput[]): Buffer {
  const localFileChunks: Buffer[] = [];
  const centralDirChunks: Buffer[] = [];
  const now = new Date();
  const { dosTime, dosDate } = toDosDateTime(now);

  let centralDirOffset = 0;

  for (const file of files) {
    const fileNameBuf = Buffer.from(file.name, "utf-8");
    const uncompressedBuf =
      typeof file.content === "string"
        ? Buffer.from(file.content, "utf-8")
        : file.content;

    const crc = zlib.crc32(uncompressedBuf);
    const compressedBuf = zlib.deflateRawSync(uncompressedBuf);

    // Use compressed version if smaller, else store uncompressed
    const useDeflate = compressedBuf.length < uncompressedBuf.length;
    const compressionMethod = useDeflate ? 8 : 0;
    const dataToWrite = useDeflate ? compressedBuf : uncompressedBuf;
    const compressedSize = dataToWrite.length;
    const uncompressedSize = uncompressedBuf.length;

    // --- Local File Header (30 bytes + filename) ---
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // Signature
    localHeader.writeUInt16LE(20, 4);          // Version needed (2.0)
    localHeader.writeUInt16LE(0x0800, 6);      // General purpose bit flag (UTF-8)
    localHeader.writeUInt16LE(compressionMethod, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(fileNameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);          // Extra field length

    const fileOffset = centralDirOffset;
    localFileChunks.push(localHeader, fileNameBuf, dataToWrite);
    centralDirOffset += localHeader.length + fileNameBuf.length + dataToWrite.length;

    // --- Central Directory Header (46 bytes + filename) ---
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Signature
    centralHeader.writeUInt16LE(20, 4);         // Version made by
    centralHeader.writeUInt16LE(20, 6);         // Version needed
    centralHeader.writeUInt16LE(0x0800, 8);     // General purpose bit flag (UTF-8)
    centralHeader.writeUInt16LE(compressionMethod, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressedSize, 20);
    centralHeader.writeUInt32LE(uncompressedSize, 24);
    centralHeader.writeUInt16LE(fileNameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);         // Extra field length
    centralHeader.writeUInt16LE(0, 32);         // File comment length
    centralHeader.writeUInt16LE(0, 34);         // Disk number start
    centralHeader.writeUInt16LE(0, 36);         // Internal file attributes
    centralHeader.writeUInt32LE(0, 38);         // External file attributes
    centralHeader.writeUInt32LE(fileOffset, 42); // Relative offset of local header

    centralDirChunks.push(centralHeader, fileNameBuf);
  }

  const centralDirBuffer = Buffer.concat(centralDirChunks);
  const centralDirSize = centralDirBuffer.length;
  const centralDirStartOffset = centralDirOffset;

  // --- End of Central Directory Record (22 bytes) ---
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);          // Signature
  eocd.writeUInt16LE(0, 4);                   // Number of this disk
  eocd.writeUInt16LE(0, 6);                   // Disk where central directory starts
  eocd.writeUInt16LE(files.length, 8);        // Number of central dir records on this disk
  eocd.writeUInt16LE(files.length, 10);       // Total number of central dir records
  eocd.writeUInt32LE(centralDirSize, 12);     // Size of central directory
  eocd.writeUInt32LE(centralDirStartOffset, 16); // Offset of start of central directory
  eocd.writeUInt16LE(0, 20);                  // Comment length

  return Buffer.concat([...localFileChunks, centralDirBuffer, eocd]);
}

export interface UserExportData {
  userId: string;
  userEmail: string;
  rawFills: Record<string, unknown>[];
  trades: Record<string, unknown>[];
  rules: Record<string, unknown>[];
  weeklyReports: Record<string, unknown>[];
}

/**
 * Builds the complete DPDP Act 2023 user export ZIP archive.
 */
export function generateUserExportZip(data: UserExportData): Buffer {
  const fillFields = [
    "id",
    "import_id",
    "trade_date",
    "fill_time",
    "symbol",
    "trade_type",
    "quantity",
    "price",
    "order_id",
    "trade_id",
  ];

  const tradeFields = [
    "id",
    "symbol",
    "segment",
    "instrument_type",
    "entry_time",
    "exit_time",
    "trade_duration_seconds",
    "is_intraday",
    "is_short",
    "quantity",
    "entry_price",
    "exit_price",
    "gross_pnl",
    "charges",
    "net_pnl",
    "tags",
    "notes",
  ];

  const ruleFields = [
    "id",
    "rule_type",
    "rule_payload",
    "natural_language_text",
    "is_active",
    "created_at",
  ];

  const reportFields = [
    "id",
    "week_start_date",
    "week_end_date",
    "total_trades",
    "winning_trades",
    "losing_trades",
    "win_rate",
    "gross_pnl",
    "total_charges",
    "net_pnl",
    "adherence_score",
    "rule_violations_count",
    "top_behavioral_leak",
    "focus_item",
  ];

  const rawFillsCsv = formatCsv(data.rawFills, fillFields);
  const tradesCsv = formatCsv(data.trades, tradeFields);
  const rulesCsv = formatCsv(data.rules, ruleFields);
  const weeklyReportsCsv = formatCsv(data.weeklyReports, reportFields);

  const manifest = {
    platform: "TradeLens",
    statutory_compliance: "Digital Personal Data Protection Act, 2023 (DPDP Act)",
    jurisdiction: "Republic of India",
    user_id: data.userId,
    user_email: data.userEmail,
    exported_at: new Date().toISOString(),
    datasets: {
      raw_fills: { filename: "raw_fills.csv", count: data.rawFills.length },
      trades: { filename: "trades.csv", count: data.trades.length },
      rules: { filename: "rules.csv", count: data.rules.length },
      weekly_reports: { filename: "weekly_reports.csv", count: data.weeklyReports.length },
    },
    regulatory_notice:
      "TradeLens is an educational behavioral trading journal and rule backtester. Not a SEBI-registered Investment Adviser or Research Analyst.",
  };

  return createZipArchive([
    { name: "manifest.json", content: JSON.stringify(manifest, null, 2) },
    { name: "raw_fills.csv", content: rawFillsCsv },
    { name: "trades.csv", content: tradesCsv },
    { name: "rules.csv", content: rulesCsv },
    { name: "weekly_reports.csv", content: weeklyReportsCsv },
  ]);
}
