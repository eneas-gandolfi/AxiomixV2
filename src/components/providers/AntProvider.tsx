/**
 * Arquivo: src/components/providers/AntProvider.tsx
 * Propósito: Configurar tema Ant Design alinhado ao Design System v2.0 (cool slate).
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

'use client'

import { ConfigProvider, App, theme as antdTheme } from 'antd'
import type { ThemeConfig } from 'antd'
import ptBR from 'antd/locale/pt_BR'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { useTheme } from '@/lib/theme-provider'
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs'
import { useServerInsertedHTML } from 'next/navigation'

const sharedTokens: ThemeConfig['token'] = {
  // Cores base
  colorPrimary:          '#FA5E24',
  colorPrimaryHover:     '#E84D13',
  colorPrimaryActive:    '#C94B1B',
  colorLink:             '#FA5E24',
  colorLinkHover:        '#E84D13',

  // Bordas
  colorBorder:           '#E2E8F0',
  colorBorderSecondary:  '#CBD5E1',

  // Texto
  colorText:             '#1E293B',
  colorTextSecondary:    '#64748B',
  colorTextTertiary:     '#94A3B8',
  colorTextQuaternary:   '#CBD5E1',
  colorTextPlaceholder:  '#94A3B8',
  colorTextDisabled:     '#CBD5E1',

  // Semânticas
  colorSuccess:          '#22C55E',
  colorWarning:          '#F59E0B',
  colorError:            '#EF4444',
  colorInfo:             '#3B82F6',

  // Tipografia — Instrument Sans para UI
  fontFamily:            "'Instrument Sans', -apple-system, sans-serif",
  fontSize:              14,
  fontSizeSM:            12,
  fontSizeLG:            16,

  // Layout
  borderRadius:          8,
  borderRadiusSM:        6,
  borderRadiusLG:        12,
  borderRadiusXS:        4,

  // Sombras
  boxShadow:             '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  boxShadowSecondary:    '0 4px 16px rgba(0,0,0,0.10)',

  // Motion
  motionDurationSlow:    '0.2s',
  motionDurationMid:     '0.15s',
  motionDurationFast:    '0.1s',

  // Controles de formulário
  controlHeight:         40,
  controlHeightSM:       32,
  controlHeightLG:       48,
}

const sharedComponents: ThemeConfig['components'] = {
  Table: {
    headerBg:            '#F1F5F9',
    headerColor:         '#64748B',
    headerSplitColor:    '#E2E8F0',
    rowHoverBg:          '#F8FAFC',
    borderColor:         '#E2E8F0',
    footerBg:            '#F1F5F9',
  },
  Modal: {
    titleFontSize:       16,
    titleColor:          '#1E293B',
    wireframe:           false,
  },
  Drawer: {
    colorBgElevated:     '#FFFFFF',
  },
  Select: {
    optionSelectedBg:    '#FFF0EB',
    optionSelectedColor: '#FA5E24',
    optionActiveBg:      '#F1F5F9',
  },
  DatePicker: {
    activeBorderColor:   '#FA5E24',
    cellActiveWithRangeBg: '#FFF0EB',
  },
  Form: {
    labelColor:          '#1E293B',
    labelFontSize:       14,
  },
}

function buildTheme(isDark: boolean): ThemeConfig {
  return {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      ...sharedTokens,
      // Backgrounds — dark mode sobrescreve
      colorBgBase:       isDark ? '#0D0D0D' : '#F8FAFC',
      colorBgContainer:  isDark ? '#141414' : '#FFFFFF',
      colorBgElevated:   isDark ? '#141414' : '#FFFFFF',
      colorBgLayout:     isDark ? '#0D0D0D' : '#F8FAFC',
      colorBgSpotlight:  isDark ? '#222222' : '#F1F5F9',
      // Bordas e texto — dark mode
      ...(isDark && {
        colorBorder:          '#2A2A2A',
        colorBorderSecondary: '#333333',
        colorText:            '#F0EDE8',
        colorTextSecondary:   '#8A8A8A',
        colorTextTertiary:    '#555555',
        colorTextQuaternary:  '#333333',
        colorTextPlaceholder: '#555555',
        colorTextDisabled:    '#333333',
      }),
    },
    components: {
      ...sharedComponents!,
      Table: {
        ...sharedComponents!.Table,
        ...(isDark && {
          headerBg:         '#1A1A1A',
          headerColor:      '#8A8A8A',
          headerSplitColor: '#2A2A2A',
          rowHoverBg:       '#1A1A1A',
          borderColor:      '#2A2A2A',
          footerBg:         '#1A1A1A',
        }),
      },
      Modal: {
        ...sharedComponents!.Modal,
        ...(isDark && { titleColor: '#F0EDE8' }),
      },
      Drawer: {
        colorBgElevated: isDark ? '#141414' : '#FFFFFF',
      },
      Form: {
        ...sharedComponents!.Form,
        ...(isDark && { labelColor: '#F0EDE8' }),
      },
    },
  }
}

export function AntProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const antTheme = useMemo(() => buildTheme(isDark), [isDark])

  const [cache] = useState(() => createCache())

  useServerInsertedHTML(() => (
    <style id="antd" dangerouslySetInnerHTML={{ __html: extractStyle(cache, true) }} />
  ))

  return (
    <StyleProvider cache={cache}>
      <div className="antd-scope">
        <ConfigProvider
          theme={{
            ...antTheme,
            cssVar: { key: 'axiomix' }
          }}
          locale={ptBR}
        >
          <App>
            {children}
          </App>
        </ConfigProvider>
      </div>
    </StyleProvider>
  )
}
