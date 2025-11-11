import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, Eye, EyeOff, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const authSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email é obrigatório'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  companyName: z.string().min(2, 'Nome da empresa deve ter pelo menos 2 caracteres').optional(),
});

type AuthFormData = z.infer<typeof authSchema>;

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
      companyName: '',
    },
  });

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const onSubmit = async (data: AuthFormData) => {
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (error) throw error;

        toast({
          title: 'Login realizado com sucesso!',
          description: 'Bem-vindo de volta.',
        });
      } else {
        // Signup - validar nome da empresa
        if (!data.companyName?.trim()) {
          toast({
            title: 'Erro no cadastro',
            description: 'Nome da empresa é obrigatório',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const redirectUrl = `${window.location.origin}/`;

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              company_name: data.companyName,
            },
          },
        });

        if (signUpError) throw signUpError;

        // TODO: Criar empresa após migração ser aplicada
        // if (authData.user) {
        //   const { data: companyData, error: companyError } = await supabase
        //     .from('companies')
        //     .insert([
        //       {
        //         name: data.companyName,
        //       },
        //     ])
        //     .select()
        //     .single();
        //
        //   if (companyError) throw companyError;
        // }

        toast({
          title: 'Empresa cadastrada com sucesso!',
          description: 'Verifique seu email para confirmar a conta.',
        });
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      
      let errorMessage = 'Ocorreu um erro. Tente novamente.';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Email ou senha incorretos.';
      } else if (error.message?.includes('User already registered')) {
        errorMessage = 'Este email já está cadastrado.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-strong">
          <CardHeader className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center"
            >
              <TrendingUp className="w-8 h-8 text-white" />
            </motion.div>
            <div>
              <CardTitle className="text-2xl font-bold">ConectAct</CardTitle>
              <CardDescription>
                {isLogin ? 'Entre com sua conta' : 'Cadastre sua empresa'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nome da Empresa</Label>
                  <Input
                    id="companyName"
                    placeholder="Nome da sua empresa"
                    {...form.register('companyName')}
                    disabled={loading}
                  />
                  {form.formState.errors.companyName && (
                    <p className="text-sm text-destructive">{form.formState.errors.companyName.message}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-10"
                    {...form.register('email')}
                    disabled={loading}
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    {...form.register('password')}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>

              {isLogin && (
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={() => {
                      toast({
                        title: 'Recuperação de senha',
                        description: 'Entre em contato com o administrador.',
                      });
                    }}
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : isLogin ? (
                  'Entrar'
                ) : (
                  'Cadastrar Empresa'
                )}
              </Button>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">
                  {isLogin ? 'Não tem empresa cadastrada?' : 'Já tem uma conta?'}
                </span>{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    form.reset();
                  }}
                  className="text-primary hover:underline font-medium"
                  disabled={loading}
                >
                  {isLogin ? 'Cadastrar' : 'Entrar'}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
