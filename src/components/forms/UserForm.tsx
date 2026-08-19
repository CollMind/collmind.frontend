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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  createUserSchema,
  updateUserSchema,
  CreateUserFormData,
  UpdateUserFormData,
} from '@/schemas/user.schema';
import { useCreateUser, useUpdateUser } from '@/services/users.service';
import {
  UserRole,
  UserStatus,
  User,
  CreateUserDto,
  SCOPE_REQUIRED_ROLES,
} from '@/types/user.types';
import { Loader2 } from 'lucide-react';
import { EnumBadge } from '@/components/common/EnumBadge';
import { UserScopeFields } from './UserScopeFields';
import { useToast } from '@/hooks/useToast';

interface UserFormProps {
  user?: User;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const toast = useToast();

  const form = useForm<CreateUserFormData | UpdateUserFormData>({
    resolver: zodResolver(user ? updateUserSchema : createUserSchema),
    defaultValues: user
      ? {
          fullName: user.fullName,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          department: user.department,
          jobTitle: user.jobTitle,
        }
      : {
          role: UserRole.PLANNER,
          status: UserStatus.ACTIVE,
          mustChangePassword: false,
          scope: [{ cplId: undefined, categoryId: undefined }],
        },
  });

  // Yalnız yaratma modunda anlamlı (`update` şeması `role` taşımaz — rol
  // değişimi bu formda YOK, [[T-242]]'nin konusu).
  const selectedRole = user ? undefined : (form.watch('role') as UserRole);
  const scopeRequired = !user && SCOPE_REQUIRED_ROLES.has(selectedRole!);

  /**
   * T-243 — backend `A3`/`R1`/`B1` kapılarının istemci tarafı yansıması:
   * `scope` anahtarı WILDCARD rollerde payload'da HİÇ BULUNMAZ (boş dizi
   * de değil — conditional spread yokluğu garantiliyor). SCOPE_REQUIRED
   * rollerde CM satırları `cplId` taşımaz (R1), "Tümü" seçimi (`null`)
   * backend'in beklediği şekilde iletilir.
   */
  const buildScopePayload = (
    role: UserRole,
    scope: CreateUserFormData['scope'],
  ): CreateUserDto['scope'] | undefined => {
    if (!SCOPE_REQUIRED_ROLES.has(role)) {
      return undefined;
    }
    return (scope ?? []).map((pair) =>
      role === UserRole.CATEGORY_MANAGER
        ? { categoryId: pair.categoryId as string }
        : { cplId: pair.cplId ?? null, categoryId: pair.categoryId ?? null },
    );
  };

  const onSubmit = async (data: CreateUserFormData | UpdateUserFormData) => {
    try {
      if (user) {
        await updateMutation.mutateAsync({
          id: user.id,
          data: data as UpdateUserFormData,
        });
      } else {
        const createData = data as CreateUserFormData;
        const scope = buildScopePayload(createData.role, createData.scope);
        const payload: CreateUserDto = {
          email: createData.email,
          password: createData.password,
          fullName: createData.fullName,
          firstName: createData.firstName,
          lastName: createData.lastName,
          role: createData.role,
          status: createData.status,
          phoneNumber: createData.phoneNumber,
          department: createData.department,
          jobTitle: createData.jobTitle,
          mustChangePassword: createData.mustChangePassword,
          permissions: createData.permissions,
          ...(scope !== undefined ? { scope } : {}),
        };
        await createMutation.mutateAsync(payload);
      }
      onSuccess?.();
    } catch (error) {
      console.error('Failed to save user:', error);
      // R2 (409, rol değişimi kapsam tutarsızlığı) ve diğer backend
      // hataları — istemci doğrulaması tek savunma değil, backend'in
      // mesajı burada kullanıcıya anlaşılır şekilde gösterilir.
      const message = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      toast.error(message || 'Kullanıcı kaydedilirken hata oluştu');
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {!user && (
          <>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="user@example.com"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="Min 8 characters"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="John Doe" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!user && (
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(UserRole).map((role) => (
                        <SelectItem key={role} value={role}>
                          <div className="flex items-center gap-2">
                            <EnumBadge value={role} type="role" />
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {scopeRequired && <UserScopeFields role={selectedRole as UserRole} />}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="John" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Doe" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {!user && (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(UserStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center gap-2">
                          <EnumBadge value={status} type="status" />
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="+90 555 123 4567" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Sales" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="jobTitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Title</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Sales Manager" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!user && (
          <FormField
            control={form.control}
            name="mustChangePassword"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Must Change Password</FormLabel>
                </div>
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {user ? 'Updating...' : 'Creating...'}
              </>
            ) : user ? (
              'Update'
            ) : (
              'Create'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
