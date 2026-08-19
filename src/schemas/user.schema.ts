import { z } from 'zod';
import { UserRole, UserStatus, SCOPE_REQUIRED_ROLES } from '@/types/user.types';

// T-243 — backend `UserScopePairDto` (`create-user.dto.ts`) ile alan
// adları birebir. `undefined` istemci-yalnız "henüz seçilmedi" durumudur;
// gönderim öncesi normalizasyon (`UserForm.tsx`) `null`e ("tümü") ya da
// backend'in beklediği şekle çevirir.
export const scopePairSchema = z.object({
  cplId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
});

export const createUserSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100),
    fullName: z
      .string()
      .min(2, 'Full name must be at least 2 characters')
      .max(200),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    role: z.nativeEnum(UserRole),
    status: z.nativeEnum(UserStatus).optional(),
    phoneNumber: z.string().optional(),
    department: z.string().optional(),
    jobTitle: z.string().optional(),
    mustChangePassword: z.boolean().optional(),
    permissions: z.array(z.string()).optional(),
    scope: z.array(scopePairSchema).optional(),
  })
  // T-243 — backend'in dört kapısının (B1/R1/A3/R2, `user.service.ts`)
  // istemci tarafı ergonomi yansıması. Bu istemci doğrulaması bir GÜVENLİK
  // katmanı DEĞİL — backend'in 400/409'u her koşulda kalır; burada amaç
  // varsayılan yolun (PLANNER + boş form) artık sessizce 400 dönmemesi.
  .superRefine((data, ctx) => {
    if (!SCOPE_REQUIRED_ROLES.has(data.role)) {
      // A3'ün istemci tarafı: UNRESTRICTED rollerde kapsam hiç sorulmaz —
      // gönderim öncesi bu alan tamamen çıkarılır (UserForm.tsx).
      return;
    }

    if (!data.scope || data.scope.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scope'],
        message: `${data.role} rolü için en az bir kapsam (CPL/Kategori) çifti gereklidir.`,
      });
      return;
    }

    data.scope.forEach((pair, index) => {
      const categoryEmpty =
        pair.categoryId === null || pair.categoryId === undefined;

      if (data.role === UserRole.CATEGORY_MANAGER) {
        // R1: CM kapsamı yalnız kategori boyutundadır, cplId taşıyamaz.
        if (pair.cplId !== null && pair.cplId !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['scope', index, 'cplId'],
            message:
              'Kategori müdürü kapsamı CPL taşıyamaz — yalnız kategori boyutundadır.',
          });
        }
        // CM'de categoryId "Tümü" (null) olamaz — {cplId:null,categoryId:null}
        // B1'in yasakladığı joker çifttir.
        if (categoryEmpty) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['scope', index, 'categoryId'],
            message:
              'Kategori seçimi zorunludur — joker kapsam (tüm kategoriler) bu rolde verilemez.',
          });
        }
        return;
      }

      // PLANNER — B1: cplId VE categoryId aynı anda boş ("Tümü") olamaz.
      const cplEmpty = pair.cplId === null || pair.cplId === undefined;
      if (cplEmpty && categoryEmpty) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scope', index, 'categoryId'],
          message:
            'CPL ve kategori aynı anda "Tümü" olamaz — joker kapsam bu rolde verilemez (ADMIN/FINANCE/READONLY kullanın).',
        });
      }
    });
  });

export const updateUserSchema = z.object({
  fullName: z.string().min(2).max(200).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
});

// Schema for user changing their own password (requires current password)
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// Schema for admin changing user's password (current password not required)
export const changeUserPasswordSchema = z
  .object({
    currentPassword: z.string().optional(), // Optional for admin
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type ChangeUserPasswordFormData = z.infer<
  typeof changeUserPasswordSchema
>;
