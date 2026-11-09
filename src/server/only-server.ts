// Pages Router: importar estos módulos solo desde API Routes o getServerSideProps.
// El paquete server-only de React está reservado al App Router en esta versión de Next.
if (typeof window !== 'undefined') throw new Error('Este módulo solo puede ejecutarse en el servidor.');
export {};
