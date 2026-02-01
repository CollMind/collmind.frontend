import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { loginSchema, LoginFormData } from '@/schemas/auth.schema';
import { useLogin } from '@/services/auth.service';
import { AlertCircle, Mail, Lock, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getClientIPAddress } from '@/utils/ipAddress';
import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { clearError } from '@/store/slices/auth.slice';

interface LoginFormProps {
  onSwitchToRegister?: () => void;
  onSwitchToForgotPassword?: () => void;
}

export function LoginForm({
  onSwitchToRegister,
  onSwitchToForgotPassword,
}: LoginFormProps) {
  const dispatch = useAppDispatch();
  const loginMutation = useLogin();
  const authError = useAppSelector((state) => state.auth.error);
  const [ipAddress, setIpAddress] = useState<string | undefined>(undefined);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Form değiştiğinde veya başarılı login sonrası error'u temizle
  useEffect(() => {
    if (loginMutation.isSuccess) {
      dispatch(clearError());
    }
  }, [loginMutation.isSuccess, dispatch]);

  // Form alanları değiştiğinde error'u temizle
  const handleFieldChange = () => {
    if (authError) {
      dispatch(clearError());
    }
  };

  // IP adresini component mount olduğunda al
  useEffect(() => {
    getClientIPAddress().then(setIpAddress).catch(() => {
      // Hata durumunda sessizce devam et (opsiyonel alan)
    });
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    try {
      // IP adresini login data'sına ekle
      const loginData = {
        ...data,
        ipAddress: ipAddress,
      };
      await loginMutation.mutateAsync(loginData);
    } catch (error) {
      // Error handling is done by mutation
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Error Alert */}
        {(loginMutation.isError || authError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {authError || 'Invalid email or password. Please try again.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Email Field */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    {...field}
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10 h-12"
                    disabled={loginMutation.isPending}
                    onChange={(e) => {
                      field.onChange(e);
                      handleFieldChange();
                    }}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Password Field */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                {onSwitchToForgotPassword && (
                  <button
                    type="button"
                    onClick={onSwitchToForgotPassword}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    {...field}
                    type="password"
                    placeholder="Enter your password"
                    className="pl-10 h-12"
                    disabled={loginMutation.isPending}
                    onChange={(e) => {
                      field.onChange(e);
                      handleFieldChange();
                    }}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Remember Me */}
        <div className="flex items-center space-x-2">
          <Checkbox id="remember" />
          <label
            htmlFor="remember"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Remember me for 30 days
          </label>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </Button>

        {/* Register Link */}
        {onSwitchToRegister && (
          <div className="text-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
            </span>
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-primary-600 hover:text-primary-700 font-semibold"
            >
              Sign up
            </button>
          </div>
        )}
      </form>
    </Form>
  );
}

