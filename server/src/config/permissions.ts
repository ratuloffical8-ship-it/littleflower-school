// server/src/config/permissions.ts

/**
 * ROLE / PERMISSION MATRIX (single source of truth).
 *
 * Roles are stored as Firebase custom claims (`role`) AND in admins/{uid}.role.
 * The backend checks, in order: valid token -> role claim -> admins/{uid}.active === true
 * -> claim equals admins/{uid}.role -> role has the permission for the route.
 * Hiding a button in the browser is NOT security; every route re-checks here.
 *
 * Notes:
 *  - teacher: sees all students/classes for now (class-level scoping is NOT implemented in version 1).
 *  - fees.manage (discounts / waivers) and payments.verify are limited to accountant + super_admin.
 *  - settings.payment (bKash / Nagad numbers) is limited to accountant + super_admin, because
 *    changing a payment number is a fraud risk.
 */

export const ADMIN_ROLES = [
  'super_admin',
  'school_admin',
  'accountant',
  'teacher',
  'admission_officer',
] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const PERMISSIONS = [
  'dashboard.view',

  'applications.view',
  'applications.review',
  'applications.convert',
  'applications.documents',

  'students.view',
  'students.manage',
  'students.export',
  'guardians.view',
  'guardians.manage',

  'classes.view',
  'classes.manage',
  'teachers.view',
  'teachers.manage',

  'attendance.view',
  'attendance.manage',

  'exams.view',
  'exams.manage',
  'results.view',
  'results.enter',
  'results.publish',

  'fees.view',
  'fees.manage',
  'payments.view',
  'payments.verify',
  'payments.documents',
  'expenses.view',
  'expenses.manage',

  'notices.manage',
  'faqs.manage',
  'gallery.manage',
  'messages.view',
  'messages.manage',

  'reports.academic',
  'reports.admissions',
  'reports.finance',

  'settings.view',
  'settings.manage',
  'settings.payment',

  'users.view',
  'users.manage',
  'logs.view',
  'backup.manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const schoolAdmin: Permission[] = [
  'dashboard.view',
  'applications.view',
  'applications.review',
  'applications.convert',
  'applications.documents',
  'students.view',
  'students.manage',
  'students.export',
  'guardians.view',
  'guardians.manage',
  'classes.view',
  'classes.manage',
  'teachers.view',
  'teachers.manage',
  'attendance.view',
  'attendance.manage',
  'exams.view',
  'exams.manage',
  'results.view',
  'results.enter',
  'results.publish',
  'fees.view',
  'payments.view',
  'expenses.view',
  'notices.manage',
  'faqs.manage',
  'gallery.manage',
  'messages.view',
  'messages.manage',
  'reports.academic',
  'reports.admissions',
  'settings.view',
  'settings.manage',
  'logs.view',
];

const accountant: Permission[] = [
  'dashboard.view',
  'students.view',
  'guardians.view',
  'classes.view',
  'fees.view',
  'fees.manage',
  'payments.view',
  'payments.verify',
  'payments.documents',
  'expenses.view',
  'expenses.manage',
  'reports.finance',
  'settings.view',
  'settings.payment',
];

const teacher: Permission[] = [
  'dashboard.view',
  'students.view',
  'classes.view',
  'attendance.view',
  'attendance.manage',
  'exams.view',
  'results.view',
  'results.enter',
];

const admissionOfficer: Permission[] = [
  'dashboard.view',
  'applications.view',
  'applications.review',
  'applications.convert',
  'applications.documents',
  'students.view',
  'classes.view',
  'reports.admissions',
];

const ROLE_PERMISSIONS: Record<AdminRole, readonly Permission[]> = {
  super_admin: PERMISSIONS,
  school_admin: schoolAdmin,
  accountant,
  teacher,
  admission_officer: admissionOfficer,
};

const ROLE_PERMISSION_SETS: Record<AdminRole, ReadonlySet<Permission>> = {
  super_admin: new Set(ROLE_PERMISSIONS.super_admin),
  school_admin: new Set(ROLE_PERMISSIONS.school_admin),
  accountant: new Set(ROLE_PERMISSIONS.accountant),
  teacher: new Set(ROLE_PERMISSIONS.teacher),
  admission_officer: new Set(ROLE_PERMISSIONS.admission_officer),
};

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === 'string' && (ADMIN_ROLES as readonly string[]).includes(value);
}

export function permissionsForRole(role: AdminRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSION_SETS[role].has(permission);
  }
