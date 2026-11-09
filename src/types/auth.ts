export type Role = 'usuario' | 'administrador';
export type SessionUser = { id: string; email: string; name: string; role: Role };
