import { describe, it, expect } from 'vitest'
import { parseAiJson } from '../parse-ai-json'

describe('parseAiJson', () => {
  it('faz parse de JSON limpo', () => {
    expect(parseAiJson('{"key": "value"}')).toEqual({ key: 'value' })
  })

  it('extrai JSON de wrapper markdown ```json```', () => {
    const raw = '```json\n{"key": "value"}\n```'
    expect(parseAiJson(raw)).toEqual({ key: 'value' })
  })

  it('extrai JSON de wrapper markdown ``` sem tipo', () => {
    const raw = '```\n{"key": "value"}\n```'
    expect(parseAiJson(raw)).toEqual({ key: 'value' })
  })

  it('extrai JSON com texto antes e depois', () => {
    const raw = 'Aqui esta o resultado: {"key": "value"} espero que ajude'
    expect(parseAiJson(raw)).toEqual({ key: 'value' })
  })

  it('remove trailing commas antes de } ou ]', () => {
    const raw = '{"a": 1, "b": 2,}'
    expect(parseAiJson(raw)).toEqual({ a: 1, b: 2 })
  })

  it('remove comentarios JS single-line', () => {
    const raw = '{"a": 1 // comentario\n}'
    expect(parseAiJson(raw)).toEqual({ a: 1 })
  })

  it('trunca JSON incompleto no ultimo } valido quando balanceado', () => {
    const raw = '{"a": 1, "b": 2} texto extra depois'
    expect(parseAiJson(raw)).toEqual({ a: 1, b: 2 })
  })

  it('lanca erro para JSON truncado sem fechamento balanceado', () => {
    const raw = '{"a": 1, "b": {"c": 2}'
    expect(() => parseAiJson(raw)).toThrow(SyntaxError)
  })

  it('unwrap array com item unico para o objeto', () => {
    const raw = '[{"a": 1}]'
    expect(parseAiJson(raw)).toEqual({ a: 1 })
  })

  it('mantém array com multiplos itens', () => {
    const raw = '[{"a": 1}, {"b": 2}]'
    expect(parseAiJson(raw)).toEqual([{ a: 1 }, { b: 2 }])
  })

  it('retorna array de primitivos sem unwrap', () => {
    const raw = '[1, 2, 3]'
    expect(parseAiJson(raw)).toEqual([1, 2, 3])
  })

  it('lanca SyntaxError para texto sem JSON', () => {
    expect(() => parseAiJson('apenas texto sem json')).toThrow(SyntaxError)
  })

  it('lanca SyntaxError com preview da resposta original', () => {
    expect(() => parseAiJson('sem json aqui')).toThrow(/Falha ao fazer parse/)
  })

  it('extrai JSON de resposta complexa com markdown e texto', () => {
    const raw = `Claro! Aqui esta a analise:

\`\`\`json
{
  "sentimento": "positivo",
  "score": 0.85,
  "tags": ["satisfeito", "engajado"]
}
\`\`\`

Espero que isso ajude na sua analise.`
    expect(parseAiJson(raw)).toEqual({
      sentimento: 'positivo',
      score: 0.85,
      tags: ['satisfeito', 'engajado'],
    })
  })

  it('lida com JSON nested complexo', () => {
    const raw = '{"a": {"b": {"c": [1, 2, 3]}}}'
    expect(parseAiJson(raw)).toEqual({ a: { b: { c: [1, 2, 3] } } })
  })

  it('lida com string vazia dentro de JSON', () => {
    const raw = '{"name": "", "value": "ok"}'
    expect(parseAiJson(raw)).toEqual({ name: '', value: 'ok' })
  })
})
