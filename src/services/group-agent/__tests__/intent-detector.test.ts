import { describe, it, expect } from 'vitest'
import { detectGroupAgentIntent } from '../intent-detector'

const trigger = ['@bot', '@axiomix']

describe('detectGroupAgentIntent', () => {
  describe('deteccao de intent por keyword', () => {
    it('detecta intent summary', () => {
      const result = detectGroupAgentIntent('@bot resumo do grupo', trigger)
      expect(result.intent).toBe('summary')
    })

    it('detecta intent summary com "sintetize"', () => {
      const result = detectGroupAgentIntent('@bot sintetize a conversa', trigger)
      expect(result.intent).toBe('summary')
    })

    it('detecta intent sales_data', () => {
      const result = detectGroupAgentIntent('@bot dados de vendas', trigger)
      expect(result.intent).toBe('sales_data')
    })

    it('detecta intent sales_data com "pipeline"', () => {
      const result = detectGroupAgentIntent('@bot pipeline atual', trigger)
      expect(result.intent).toBe('sales_data')
    })

    it('detecta intent report', () => {
      const result = detectGroupAgentIntent('@bot gerar relatório', trigger)
      expect(result.intent).toBe('report')
    })

    it('detecta intent suggestion', () => {
      const result = detectGroupAgentIntent('@bot sugestão para o cliente', trigger)
      expect(result.intent).toBe('suggestion')
    })

    it('detecta intent suggestion com "próximo passo"', () => {
      const result = detectGroupAgentIntent('@bot próximo passo', trigger)
      expect(result.intent).toBe('suggestion')
    })
  })

  describe('fallback para rag_query e general', () => {
    it('detecta rag_query quando termina com ?', () => {
      const result = detectGroupAgentIntent('@bot qual o prazo?', trigger)
      expect(result.intent).toBe('rag_query')
    })

    it('detecta rag_query com palavra interrogativa "como"', () => {
      const result = detectGroupAgentIntent('@bot como funciona o produto', trigger)
      expect(result.intent).toBe('rag_query')
    })

    it('detecta rag_query com palavra interrogativa "o que"', () => {
      const result = detectGroupAgentIntent('@bot o que e isso', trigger)
      expect(result.intent).toBe('rag_query')
    })

    it('detecta rag_query com "quando"', () => {
      const result = detectGroupAgentIntent('@bot quando entrega', trigger)
      expect(result.intent).toBe('rag_query')
    })

    it('greeting para saudação simples', () => {
      const result = detectGroupAgentIntent('@bot bom dia', trigger)
      expect(result.intent).toBe('greeting')
    })

    it('fallback para general quando nao match nada', () => {
      const result = detectGroupAgentIntent('@bot preciso de algo diferente', trigger)
      expect(result.intent).toBe('general')
    })

    it('fallback para general com mensagem simples', () => {
      const result = detectGroupAgentIntent('@bot ok obrigado', trigger)
      expect(result.intent).toBe('general')
    })
  })

  describe('strip trigger', () => {
    it('remove trigger keyword do inicio', () => {
      const result = detectGroupAgentIntent('@bot resumo', trigger)
      expect(result.cleanedQuery).toBe('resumo')
    })

    it('remove trigger seguido de virgula', () => {
      const result = detectGroupAgentIntent('@bot, resumo do dia', trigger)
      expect(result.cleanedQuery).toBe('resumo do dia')
    })

    it('remove trigger seguido de dois pontos', () => {
      const result = detectGroupAgentIntent('@bot: dados vendas', trigger)
      expect(result.cleanedQuery).toBe('dados vendas')
    })

    it('usa segundo trigger keyword', () => {
      const result = detectGroupAgentIntent('@axiomix resumo', trigger)
      expect(result.cleanedQuery).toBe('resumo')
    })

    it('nao remove trigger quando nao esta no inicio', () => {
      const result = detectGroupAgentIntent('ola @bot resumo', trigger)
      expect(result.cleanedQuery).toBe('ola @bot resumo')
    })
  })

  describe('case insensitive', () => {
    it('detecta keywords em uppercase', () => {
      const result = detectGroupAgentIntent('@bot RESUMO DO GRUPO', trigger)
      expect(result.intent).toBe('summary')
    })

    it('detecta keywords em mixed case', () => {
      const result = detectGroupAgentIntent('@bot Dados de Vendas', trigger)
      expect(result.intent).toBe('sales_data')
    })

    it('strip trigger case insensitive', () => {
      const result = detectGroupAgentIntent('@BOT resumo', ['@bot'])
      expect(result.cleanedQuery).toBe('resumo')
    })
  })

  describe('keywords com acento', () => {
    it('detecta "métricas" com acento', () => {
      const result = detectGroupAgentIntent('@bot métricas do mes', trigger)
      expect(result.intent).toBe('sales_data')
    })

    it('detecta "metricas" sem acento', () => {
      const result = detectGroupAgentIntent('@bot metricas do mes', trigger)
      expect(result.intent).toBe('sales_data')
    })

    it('detecta "relatório" com acento', () => {
      const result = detectGroupAgentIntent('@bot relatório semanal', trigger)
      expect(result.intent).toBe('report')
    })

    it('detecta "sugestão" com acento', () => {
      const result = detectGroupAgentIntent('@bot sugestão', trigger)
      expect(result.intent).toBe('suggestion')
    })
  })
})
