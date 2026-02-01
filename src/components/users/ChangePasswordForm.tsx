import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  changePasswordSchema,
  changeUserPasswordSchema,
  ChangePasswordFormData,
  ChangeUserPasswordFormData,
} from '@/schemas/user.schema';
import { useChangeMyPassword, useChangeUserPassword } from '@/services/users.service';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface ChangePasswordFormProps {
  userId?: string; // If provided, admin is changing user's password. Otherwise, user is changing their own password.
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ChangePasswordForm({
  userId,
  onSuccess,
  onCancel,
}: ChangePasswordFormProps) {
  const changeMyPasswordMutation = useChangeMyPassword();
  const changeUserPasswordMutation = useChangeUserPassword();
  const toast = useToast();

  // Use different schema based on whether admin is changing user's password
  const schema = userId ? changeUserPasswordSchema : changePasswordSchema;
  const form = useForm<ChangePasswordFormData | ChangeUserPasswordFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ChangePasswordFormData | ChangeUserPasswordFormData) => {
    try {
      if (userId) {
        // Admin changing user's password - no current password needed
        await changeUserPasswordMutation.mutateAsync({
          id: userId,
          data: {
            // Admin doesn't need to provide current password
            newPassword: data.newPassword,
          },
        });
        toast.success('Kullanıcı şifresi başarıyla güncellendi');
      } else {
        // User changing their own password - current password is required
        await changeMyPasswordMutation.mutateAsync({
          currentPassword: data.currentPassword!,
          newPassword: data.newPassword,
        });
        toast.success('Şifreniz başarıyla güncellendi');
      }
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Şifre değiştirme işlemi başarısız oldu';
      toast.error(errorMessage);
      
      // If current password is wrong, clear it (only for self-service password change)
      if (!userId && error?.response?.status === 400) {
        form.setError('currentPassword', {
          type: 'manual',
          message: 'Mevcut şifre hatalı',
        });
      }
    }
  };

  const isLoading =
    changeMyPasswordMutation.isPending || changeUserPasswordMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {!userId && (
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mevcut Şifre *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    placeholder="Mevcut şifrenizi girin"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Yeni Şifre *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="password"
                  placeholder="En az 8 karakter"
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-gray-500 mt-1">
                Şifre en az 8 karakter olmalıdır
              </p>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Yeni Şifre Tekrar *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="password"
                  placeholder="Yeni şifrenizi tekrar girin"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              İptal
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Güncelleniyor...
              </>
            ) : (
              'Şifreyi Güncelle'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
