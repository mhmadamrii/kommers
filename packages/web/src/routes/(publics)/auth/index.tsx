import { createFileRoute } from '@tanstack/react-router';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { LoginForm } from './-components/login-form';
import { RegisterForm } from './-components/register-form';

export const Route = createFileRoute('/(publics)/auth/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className='flex min-h-screen items-center justify-center p-4'>
      <Card className='w-full max-w-sm'>
        <CardHeader>
          <CardTitle className='text-2xl'>Welcome to kommers</CardTitle>
          <CardDescription>Login or create an account</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue='login'>
            <TabsList className='mb-4 grid w-full grid-cols-2'>
              <TabsTrigger value='login'>Login</TabsTrigger>
              <TabsTrigger value='register'>Register</TabsTrigger>
            </TabsList>
            <TabsContent value='login'>
              <LoginForm />
            </TabsContent>
            <TabsContent value='register'>
              <RegisterForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
