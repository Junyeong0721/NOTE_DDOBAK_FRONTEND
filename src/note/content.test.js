import { describe, it, expect } from 'vitest'
import { EMPTY_CONTENT, PAGE_HEIGHT, PAGE_WIDTH, addPoint, createStroke, parseContent, serializeContent } from './content'

describe('content', () => {
  it('uses an A4 page 1000 wide', () => {
    expect(PAGE_WIDTH).toBe(1000)
    expect(PAGE_HEIGHT).toBe(1414)
  })

  it('EMPTY_CONTENT has a page size and one empty page', () => {
    expect(JSON.parse(EMPTY_CONTENT)).toEqual({ version: 1, page: { width: 1000, height: 1414 }, pages: [{ strokes: [] }] })
  })

  it('fills the default page size for week-1 notes', () => {
    const c = parseContent('{"version":1,"pages":[{"strokes":[]}]}')
    expect(c.page).toEqual({ width: 1000, height: 1414 })
    expect(c.pages).toEqual([{ strokes: [] }])
  })

  it('adds one empty page when pages is empty', () => {
    expect(parseContent('{"version":1,"pages":[]}').pages).toEqual([{ strokes: [] }])
  })

  it('throws a readable error for non-JSON', () => {
    expect(() => parseContent('hello')).toThrow('필기 데이터를 읽을 수 없습니다.')
  })

  it('round-trips through serializeContent', () => {
    const c = parseContent(EMPTY_CONTENT)
    expect(parseContent(serializeContent(c))).toEqual(c)
  })

  it('createStroke makes unique ids and no transform', () => {
    const a = createStroke({ t0: 1000, color: '#222222', width: 2.4 })
    const b = createStroke({ t0: 1000, color: '#222222', width: 2.4 })
    expect(a.id).not.toBe(b.id)
    expect(a.id.startsWith('s_1000_')).toBe(true)
    expect(a).toEqual({ id: a.id, t0: 1000, color: '#222222', width: 2.4, points: [], transform: null })
  })

  it('addPoint rounds and returns a new stroke', () => {
    const s0 = createStroke({ t0: 1000, color: '#222222', width: 2.4 })
    const s1 = addPoint(s0, { x: 12.345, y: 6.789, pressure: 0.4567, t: 1016.4 })
    expect(s1.points).toEqual([[12.3, 6.8, 0.46, 16]])
    expect(s0.points).toEqual([])
  })

  it('addPoint uses 0.5 when pressure is 0 or missing', () => {
    const s0 = createStroke({ t0: 0, color: '#222222', width: 2.4 })
    expect(addPoint(s0, { x: 1, y: 1, pressure: 0, t: 0 }).points[0][2]).toBe(0.5)
    expect(addPoint(s0, { x: 1, y: 1, t: 0 }).points[0][2]).toBe(0.5)
  })
})
