import { describe, it, expect } from 'vitest'
import { ALL, UNFILED, countByFolder, filterNotes } from './filterNotes'

const notes = [
  { id: 1, title: '자료구조 3주차 트리', folderId: 10 },
  { id: 2, title: 'Operating Systems', folderId: 20 },
  { id: 3, title: '아무 메모', folderId: null },
  { id: 4, title: '자료구조 4주차 그래프', folderId: 10 },
]

describe('filterNotes', () => {
  it('shows everything for ALL with an empty query', () => {
    expect(filterNotes(notes, { folder: ALL, query: '' }).map((n) => n.id)).toEqual([1, 2, 3, 4])
  })

  it('filters by folder and by unfiled', () => {
    expect(filterNotes(notes, { folder: 10, query: '' }).map((n) => n.id)).toEqual([1, 4])
    expect(filterNotes(notes, { folder: UNFILED, query: '' }).map((n) => n.id)).toEqual([3])
  })

  it('searches titles ignoring case and surrounding spaces', () => {
    expect(filterNotes(notes, { folder: ALL, query: '  operating ' }).map((n) => n.id)).toEqual([2])
  })

  it('combines folder and search', () => {
    expect(filterNotes(notes, { folder: 10, query: '그래프' }).map((n) => n.id)).toEqual([4])
    expect(filterNotes(notes, { folder: 20, query: '그래프' })).toEqual([])
  })

  it('treats missing folderId (old notes) as unfiled', () => {
    expect(filterNotes([{ id: 9, title: 'old' }], { folder: UNFILED, query: '' }).map((n) => n.id)).toEqual([9])
  })
})

describe('countByFolder', () => {
  it('counts all, unfiled and each folder', () => {
    expect(countByFolder(notes)).toEqual({ all: 4, unfiled: 1, 10: 2, 20: 1 })
  })
})
