/**
 * Arquivo: src/components/whatsapp/metric-card-with-sparkline.tsx
 * Proposito: Card de metrica com sparkline mostrando tendencia.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Target,
  AlertCircle,
  MessageSquare,
} from "lucide-react";

type SparklineData = {
  value: number;
};

type IconName = "sparkles" | "target" | "alert" | "message" | "trending-up" | "trending-down";

type MetricCardWithSparklineProps = {
  title: string;
  value: number;
  subtitle?: string;
  icon?: IconName;
  sparklineData?: SparklineData[];
  change?: number | null;
  color?: "success" | "warning" | "danger" | "primary";
  className?: string;
};

function getIconComponent(iconName?: IconName) {
  switch (iconName) {
    case "sparkles":
      return Sparkles;
    case "target":
      return Target;
    case "alert":
      return AlertCircle;
    case "message":
      return MessageSquare;
    case "trending-up":
      return TrendingUp;
    case "trending-down":
      return TrendingDown;
    default:
      return null;
  }
}

function getColorClasses(color?: string) {
  switch (color) {
    case "success":
      return { text: "text-success", bg: "bg-success-light", stroke: "var(--color-success)" };
    case "warning":
      return { text: "text-warning", bg: "bg-warning-light", stroke: "var(--color-warning)" };
    case "danger":
      return { text: "text-danger", bg: "bg-danger-light", stroke: "var(--color-danger)" };
    case "primary":
      return { text: "text-primary", bg: "bg-primary-light", stroke: "var(--color-primary)" };
    default:
      return { text: "text-text", bg: "bg-background", stroke: "var(--color-muted)" };
  }
}

function getTrendIcon(change?: number | null) {
  if (change === null || change === undefined) {
    return null;
  }
  if (change > 0) {
    return <TrendingUp className="h-3.5 w-3.5 text-success" />;
  }
  if (change < 0) {
    return <TrendingDown className="h-3.5 w-3.5 text-danger" />;
  }
  return <Minus className="h-3.5 w-3.5 text-muted" />;
}

function formatChange(change?: number | null) {
  if (change === null || change === undefined) {
    return null;
  }
  const sign = change > 0 ? "+" : "";
  return `${sign}${change}%`;
}

export function MetricCardWithSparkline({
  title,
  value,
  subtitle,
  icon,
  sparklineData = [],
  change,
  color,
  className,
}: MetricCardWithSparklineProps) {
  const colors = getColorClasses(color);
  const trendIcon = getTrendIcon(change);
  const changeFormatted = formatChange(change);
  const IconComponent = getIconComponent(icon);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs">{title}</CardDescription>
        <div className="flex items-center justify-between">
          <CardTitle className={`text-3xl tabular-nums ${color ? colors.text : ""}`}>
            {value}
          </CardTitle>
          {IconComponent && <IconComponent className={`h-5 w-5 ${colors.text}`} />}
        </div>
      </CardHeader>
      <CardContent>
        {sparklineData.length > 0 && (
          <div className="mb-2 h-8">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={colors.stroke}
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted">{subtitle}</p>
          {(trendIcon || changeFormatted) && (
            <div className="flex items-center gap-1">
              {trendIcon}
              {changeFormatted && (
                <span className={`text-xs font-medium ${change && change > 0 ? "text-success" : change && change < 0 ? "text-danger" : "text-muted"}`}>
                  {changeFormatted}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
