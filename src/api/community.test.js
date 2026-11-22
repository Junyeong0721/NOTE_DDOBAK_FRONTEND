import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  addComment, copyPost, deleteComment, getPost, getPublish, listComments, listPosts, listSubjects,
  reportPost, savePublish, setLike, unpublish,
} from './community'

afterEach(() => vi.restoreAllMocks())

const ok = (body, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('community api', () => {
  it('publishes, edits and stops sharing a note', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockImplementation((url, o) => Promise.resolve(o?.method === 'DELETE' ? ok(null, 204) : ok({ published: true })))
    await getPublish(4)
    await savePublish(4, { title: '극한', subject: '수학' })
    await savePublish(4, { title: '극한', subject: '수학', intro: '정리', refreshContent: true })
    await unpublish(4)
    expect(f.mock.calls.map((c) => [c[0], c[1]?.method])).toEqual([
      ['/api/notes/4/publish', undefined],
      ['/api/notes/4/publish', 'PUT'],
      ['/api/notes/4/publish', 'PUT'],
      ['/api/notes/4/publish', 'DELETE'],
    ])
    expect(JSON.parse(f.mock.calls[1][1].body)).toEqual({ title: '극한', subject: '수학', intro: '', refreshContent: false })
    expect(JSON.parse(f.mock.calls[2][1].body)).toEqual({ title: '극한', subject: '수학', intro: '정리', refreshContent: true })
  })

  it('builds list queries without empty filters', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(ok({ items: [], hasMore: false })))
    await listPosts()
    await listPosts({ sort: 'popular', subject: '수학 Ⅱ', q: '  100% 극한 ', page: 2 })
    expect(f.mock.calls[0][0]).toBe('/api/community?sort=latest&page=0')
    const url = new URL(f.mock.calls[1][0], 'http://x')
    expect(url.pathname).toBe('/api/community')
    expect(Object.fromEntries(url.searchParams)).toEqual({ sort: 'popular', page: '2', subject: '수학 Ⅱ', q: '100% 극한' })
  })

  it('reads posts and acts on them', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockImplementation((url, o) => Promise.resolve(o?.method === 'DELETE' && url.includes('comments') ? ok(null, 204) : ok({})))
    await listSubjects()
    await getPost(9)
    await setLike(9, true)
    await setLike(9, false)
    await copyPost(9)
    await listComments(9)
    await addComment(9, '고마워요')
    await deleteComment(9, 3)
    await reportPost(9, 'spam')
    expect(f.mock.calls.map((c) => `${c[1]?.method ?? 'GET'} ${c[0]}`)).toEqual([
      'GET /api/community/subjects',
      'GET /api/community/9',
      'PUT /api/community/9/like',
      'DELETE /api/community/9/like',
      'POST /api/community/9/copy',
      'GET /api/community/9/comments',
      'POST /api/community/9/comments',
      'DELETE /api/community/9/comments/3',
      'POST /api/community/9/report',
    ])
    expect(JSON.parse(f.mock.calls[6][1].body)).toEqual({ body: '고마워요' })
    expect(JSON.parse(f.mock.calls[8][1].body)).toEqual({ reason: 'spam' })
  })
})
