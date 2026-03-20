/**
 * Arquivo: src/services/report/pdf-template.tsx
 * Propósito: Template React-PDF para relatório semanal com layout profissional.
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

import React from "react";
import { Document, Page, Text, View, StyleSheet, Svg, Rect, Line, G } from "@react-pdf/renderer";
import type { WeeklyMetrics, WeeklyPeriod } from "@/services/report/generator";

const PRIMARY = "#FA5E24";
const PRIMARY_LIGHT = "#FFF0EB";
const DARK = "#1A1A1A";
const GRAY = "#6B7280";
const LIGHT_GRAY = "#F5F3F0";
const WHITE = "#FFFFFF";
const GREEN = "#16A34A";
const RED = "#DC2626";

export const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: DARK,
    backgroundColor: WHITE,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 40,
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: PRIMARY,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 11,
    color: GRAY,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
    marginTop: 20,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: PRIMARY_LIGHT,
  },
  cardsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: LIGHT_GRAY,
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
  },
  cardValue: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 2,
  },
  cardLabel: {
    fontSize: 8,
    color: GRAY,
    textAlign: "center",
  },
  cardHighlight: {
    backgroundColor: PRIMARY_LIGHT,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.5,
    color: DARK,
    marginBottom: 6,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 4,
    paddingLeft: 8,
  },
  bullet: {
    width: 14,
    fontSize: 10,
    color: PRIMARY,
    fontFamily: "Helvetica-Bold",
  },
  listText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.4,
    color: DARK,
  },
  contactChip: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
    marginBottom: 4,
  },
  contactChipText: {
    fontSize: 9,
    color: PRIMARY,
    fontFamily: "Helvetica-Bold",
  },
  contactsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  radarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: LIGHT_GRAY,
    borderRadius: 4,
  },
  radarPlatform: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    width: 80,
  },
  radarScore: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
    width: 50,
  },
  radarContent: {
    fontSize: 8,
    color: GRAY,
    flex: 1,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: LIGHT_GRAY,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: GRAY,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginLeft: 6,
  },
  badgePositive: {
    backgroundColor: "#DCFCE7",
  },
  badgeNegative: {
    backgroundColor: "#FEE2E2",
  },
  badgeText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  badgeTextPositive: {
    color: GREEN,
  },
  badgeTextNegative: {
    color: RED,
  },
});

export function formatPeriodLabel(period: WeeklyPeriod) {
  const start = period.weekStartIso.slice(0, 10);
  const end = period.weekEndIso.slice(0, 10);
  return `${start}  a  ${end}`;
}

export function formatDate() {
  return new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}



function BarChart({
  data,
}: {
  data: Array<{ label: string; value: number; color?: string }>;
}) {
  return null;
}



type WeeklyReportPdfProps = {
  metrics: WeeklyMetrics;
  period: WeeklyPeriod;
  reportText: string;
};

export function WeeklyReportDocument({ metrics, period, reportText }: WeeklyReportPdfProps) {
  return (
    <Document>
      <Page size="A4">
        <Text>TEST PAGE PDF</Text>
      </Page>
    </Document>
  );
}

export type { WeeklyReportPdfProps };
