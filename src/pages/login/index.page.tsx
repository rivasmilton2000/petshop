import type { GetServerSideProps } from 'next';
import { AuthForm } from '@/components/AuthForm';
import { googleAvailable } from '@/server/google';

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Cache-Control', 'no-store');
  return { props: { googleEnabled: googleAvailable() } };
};
export default function Login({ googleEnabled }: { googleEnabled: boolean }) { return <AuthForm mode="login" googleEnabled={googleEnabled} />; }
