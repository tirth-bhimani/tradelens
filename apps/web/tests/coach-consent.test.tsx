import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { InviteModal } from "../components/coach/invite-modal";
import { RosterTable } from "../components/coach/roster-table";
import { ConsentScreen } from "../components/coach/consent-screen";
import { CoachConsentManager } from "../components/settings/coach-consent-manager";
import type {
  CoachInvitation,
  CoachAccessRecord,
  StudentRosterItem,
} from "../lib/coach/coach-types";
import {
  DEFAULT_SAMPLE_COACHES,
  DEFAULT_SAMPLE_ROSTER,
  SAMPLE_INVITATION,
} from "../lib/coach/coach-defaults";
import {
  validateInviteTokenAction,
  acceptCoachConsentAction,
  revokeCoachConsentAction,
} from "../lib/coach/coach-actions";

describe("Coach-Trader Organization & Permission Consent Model (Task 24)", () => {
  describe("InviteModal Component", () => {
    it("renders modal dialog when isOpen is true with zero-trust explanation", () => {
      const html = renderToStaticMarkup(
        <InviteModal isOpen={true} onClose={() => {}} />
      );
      expect(html).toContain("Invite Student Trader");
      expect(html).toContain("Zero-Trust Trader Data Consent");
      expect(html).toContain("Link Expiration Window");
      expect(html).toContain("Generate Consent Link");
    });

    it("returns null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        <InviteModal isOpen={false} onClose={() => {}} />
      );
      expect(html).toBe("");
    });
  });

  describe("RosterTable Component", () => {
    it("renders student roster items, metrics, and risk flags", () => {
      const html = renderToStaticMarkup(
        <RosterTable initialRoster={DEFAULT_SAMPLE_ROSTER} onInviteClick={() => {}} />
      );
      expect(html).toContain("Aakash Sharma");
      expect(html).toContain("Active Consent");
      expect(html).toContain("61.9%");
      expect(html).toContain("Disciplined");
      expect(html).toContain("High Tilt Risk");
      expect(html).toContain("Divya Nair");
      expect(html).toContain("Access Revoked");
    });

    it("renders empty state when roster is empty", () => {
      const html = renderToStaticMarkup(
        <RosterTable initialRoster={[]} onInviteClick={() => {}} />
      );
      expect(html).toContain("No students found");
      expect(html).toContain("Generate Student Invite");
    });
  });

  describe("ConsentScreen Component", () => {
    it("renders coach identity, explicit permissions, and negative assurances", () => {
      const html = renderToStaticMarkup(
        <ConsentScreen invitation={SAMPLE_INVITATION} />
      );
      expect(html).toContain("Coach Mentorship Invitation");
      expect(html).toContain("Vikram Sengupta (CMT)");
      expect(html).toContain("Alpha Edge Mentorship");
      expect(html).toContain("What your coach WILL be able to see");
      expect(html).toContain("Read-only Closed Trade History");
      expect(html).toContain("Strict Security &amp; Privacy Assurances");
      expect(html).toContain("No Broker Execution");
      expect(html).toContain("No Credentials or Secrets");
      expect(html).toContain("Instant Revocation Guarantee");
      expect(html).toContain("Accept &amp; Grant Read-Only Access");
      expect(html).toContain("Decline Invitation");
    });
  });

  describe("CoachConsentManager Component", () => {
    it("renders active authorizations and revoke buttons", () => {
      const html = renderToStaticMarkup(
        <CoachConsentManager initialCoaches={DEFAULT_SAMPLE_COACHES} />
      );
      expect(html).toContain("Active Coach Authorizations (1)");
      expect(html).toContain("Vikram Sengupta (CMT)");
      expect(html).toContain("Active Consent");
      expect(html).toContain("Revoke Access");
      expect(html).toContain("Past Authorizations (1)");
      expect(html).toContain("Pooja Mehta");
      expect(html).toContain("Access Revoked");
    });

    it("renders empty state when trader has no active coaches", () => {
      const html = renderToStaticMarkup(
        <CoachConsentManager initialCoaches={[]} />
      );
      expect(html).toContain("No active coach authorizations");
      expect(html).toContain("completely private");
    });
  });

  describe("Consent Action State Transitions", () => {
    it("validates sample invitation token", async () => {
      const res = await validateInviteTokenAction(SAMPLE_INVITATION.invite_token);
      expect(res.error).toBeUndefined();
      expect(res.invitation).toBeDefined();
      expect(res.invitation?.coach_name).toContain("Vikram");
    });

    it("accepts consent and updates status", async () => {
      const res = await acceptCoachConsentAction(SAMPLE_INVITATION.invite_token);
      expect(res.success).toBe(true);
      expect(res.coachName).toContain("Vikram");
    });

    it("revokes coach access instantaneously", async () => {
      const res = await revokeCoachConsentAction("coach-01");
      expect(res.success).toBe(true);
    });
  });
});
