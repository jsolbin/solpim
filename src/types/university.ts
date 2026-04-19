export interface University {
  id: string
  name: string
}

export interface Department {
  id: string
  name: string
  universityId: string
}
