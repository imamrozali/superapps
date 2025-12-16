import { db } from './index';
import { permissions, organizations, organizationUnits, roles, rolePermissions, users, userIdentifiers, passwordCredentials, organizationMemberships, roleAssignments } from './schema';
import { hashPassword } from '../auth';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('Seeding database...');

  // Create permissions
  const perms = [
    { code: 'user:read', description: 'Read user data' },
    { code: 'user:write', description: 'Write user data' },
    { code: 'org:read', description: 'Read organization data' },
    { code: 'org:write', description: 'Write organization data' },
    { code: 'admin', description: 'Full admin access' },
  ];

  for (const perm of perms) {
    await db.insert(permissions).values(perm);
  }

  // Create organization
  const orgId = uuidv4();
  await db.insert(organizations).values({
    id: orgId,
    name: 'Default Organization',
  });

  // Create organization unit
  const unitId = uuidv4();
  await db.insert(organizationUnits).values({
    id: unitId,
    organizationId: orgId,
    name: 'Main Branch',
  });

  // Create roles
  const adminRoleId = uuidv4();
  await db.insert(roles).values({
    id: adminRoleId,
    organizationId: orgId,
    name: 'Admin',
  });

  // Assign all permissions to admin role
  const allPerms = await db.select().from(permissions);
  for (const perm of allPerms) {
    await db.insert(rolePermissions).values({
      roleId: adminRoleId,
      permissionId: perm.id,
    });
  }

  // Create admin user
  const userId = uuidv4();
  await db.insert(users).values({
    id: userId,
    status: 'active',
  });

  await db.insert(userIdentifiers).values({
    userId,
    type: 'email',
    value: 'admin@example.com',
    verified: true,
  });

  const passwordHash = await hashPassword('password123');
  await db.insert(passwordCredentials).values({
    userId,
    passwordHash,
  });

  // Create membership
  const membershipId = uuidv4();
  await db.insert(organizationMemberships).values({
    id: membershipId,
    userId,
    organizationId: orgId,
    organizationUnitId: unitId,
  });

  // Assign admin role
  await db.insert(roleAssignments).values({
    membershipId,
    roleId: adminRoleId,
  });

  console.log('Seeding completed!');
}

seed().catch(console.error);