/**
 * Arquivo: src/services/report/pdf-generator.ts
 * Propósito: Gerar PDF do relatório semanal usando @react-pdf/renderer.
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

import "server-only";

import React from "react";
import { renderToBuffer, Document, Page, Text, View, type DocumentProps } from "@react-pdf/renderer";
import { styles, formatPeriodLabel, formatDate } from "@/services/report/pdf-template";
import type { WeeklyMetrics, WeeklyPeriod } from "@/services/report/generator";

function fixReactElements(node: any): any {
  if (!node || typeof node !== "object") return node;

  if (Array.isArray(node)) {
    return node.map(fixReactElements);
  }

  const isTransitional = node.$$typeof === Symbol.for("react.transitional.element");
  const isElement = node.$$typeof === Symbol.for("react.element");

  if (isTransitional || isElement) {
    const newProps = { ...node.props };
    if (newProps.children) {
      newProps.children = fixReactElements(newProps.children);
    }
    delete newProps.ref;
    
    return {
      ...node,
      $$typeof: Symbol.for("react.element"),
      props: newProps,
      ref: null,
    };
  }

  return node;
}

export async function generateWeeklyReportPdf(
  metrics: WeeklyMetrics,
  period: WeeklyPeriod,
  reportText: string
): Promise<Buffer> {
  const narrativeLines = reportText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const element = (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {metrics.companyName} — Relatório Semanal
          </Text>
          <Text style={styles.headerSubtitle}>
            Período: {formatPeriodLabel(period)} | Gerado em {formatDate()}
          </Text>
        </View>

        {/* WhatsApp Metrics Cards */}
        <Text style={styles.sectionTitle}>WhatsApp — Métricas</Text>
        <View style={styles.cardsRow}>
          <View style={[styles.card]}>
            <Text style={styles.cardValue}>{metrics.activeConversations}</Text>
            <Text style={styles.cardLabel}>Conversas Ativas</Text>
          </View>
          <View style={[styles.card]}>
            <Text style={styles.cardValue}>{metrics.conversationsAnalyzed}</Text>
            <Text style={styles.cardLabel}>Analisadas (IA)</Text>
          </View>
          <View style={[styles.card, styles.cardHighlight]}>
            <Text style={styles.cardValue}>{metrics.salesOpportunities}</Text>
            <Text style={styles.cardLabel}>Oportunidades</Text>
          </View>
          <View style={[styles.card]}>
            <Text style={styles.cardValue}>{metrics.negativeSentiments}</Text>
            <Text style={styles.cardLabel}>Sentimentos Neg.</Text>
          </View>
        </View>

        {/* Purchase intent contacts */}
        {metrics.topPurchaseContacts?.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Contatos com Intenção de Compra</Text>
            <View style={styles.contactsRow}>
              {metrics.topPurchaseContacts.map((name, i) => (
                <View key={i} style={styles.contactChip}>
                  <Text style={styles.contactChipText}>{name}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Social Media */}
        <Text style={styles.sectionTitle}>Redes Sociais</Text>
        <View style={styles.cardsRow}>
          <View style={[styles.card, styles.cardHighlight]}>
            <Text style={styles.cardValue}>{metrics.postsPublished}</Text>
            <Text style={styles.cardLabel}>Posts Publicados</Text>
          </View>
        </View>
        <Text style={styles.paragraph}>{metrics.socialPerformanceSummary}</Text>

        {/* Radar top posts */}
        {metrics.topRadarPosts?.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Top Posts do Radar</Text>
            {metrics.topRadarPosts.map((post, i) => (
              <View key={i} style={styles.radarRow}>
                <Text style={styles.radarPlatform}>{post.platform}</Text>
                <Text style={styles.radarScore}>Score: {post.engagementScore}</Text>
                <Text style={styles.radarContent}>
                  {post.content.length > 120 ? `${post.content.slice(0, 120)}...` : post.content}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Competitors */}
        <Text style={styles.sectionTitle}>Concorrentes</Text>
        <Text style={styles.paragraph}>{metrics.competitorSummary}</Text>

        {/* AI Narrative / Recommended actions */}
        <Text style={styles.sectionTitle}>Análise e Ações Recomendadas</Text>
        <View>
          {narrativeLines.map((line, i) => {
            const cleanLine = line.replace(/\*/g, "");
            return (
              <View key={i} style={styles.listItem}>
                <Text style={styles.bullet}>{"\u2022"}</Text>
                <Text style={styles.listText}>{cleanLine}</Text>
              </View>
            );
          })}
        </View>

        {/* Digest summaries */}
        {metrics.digestSummaries?.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Resumos dos Batches</Text>
            {metrics.digestSummaries.map((summary, i) => (
              <View key={i} style={styles.listItem}>
                <Text style={styles.bullet}>{i + 1}.</Text>
                <Text style={styles.listText}>{summary}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>AXIOMIX — Relatório Semanal Automatizado</Text>
          <Text style={styles.footerText}>{formatPeriodLabel(period)}</Text>
        </View>
      </Page>
    </Document>
  );

  const fixedElement = fixReactElements(element);

  const buffer = await renderToBuffer(fixedElement);
  return Buffer.from(buffer);
}
