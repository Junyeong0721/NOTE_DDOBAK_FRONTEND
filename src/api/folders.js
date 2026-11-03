// 과목별 폴더 API. 색은 형광펜 6색 중 하나(키로 저장).
import { request } from './notes'

export const FOLDER_COLORS = {
  yellow: '#ffd84d',
  pink: '#ff7aa8',
  mint: '#3ccfa8',
  sky: '#4da8ff',
  orange: '#ff9f43',
  lavender: '#9b8cff',
}
export const FOLDER_COLOR_KEYS = Object.keys(FOLDER_COLORS)

const BASE = '/api/folders'

export const listFolders = () => request(BASE)

export const createFolder = ({ name, color }) =>
  request(BASE, { method: 'POST', body: JSON.stringify({ name, color }) })

export const updateFolder = (id, { name, color }) =>
  request(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify({ name, color }) })

export async function deleteFolder(id) {
  await request(`${BASE}/${id}`, { method: 'DELETE' })
}
