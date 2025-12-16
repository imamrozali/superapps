# Monolith to Microservices Migration Strategy

## Current Monolith Architecture

```
┌────────────────────┐
│   Next.js BFF      │
│                    │
│ - Auth Routes      │
│ - User Mgmt        │
│ - Org Mgmt         │
│ - IAM/RBAC         │
│ - Token Validation │
│                    │
│     ┌─────────┐    │
│     │ Drizzle │    │
│     │  ORM    │    │
│     └─────────┘    │
└────────────────────┘
        │
        ▼
┌────────────────────┐
│     PostgreSQL     │
│     Single DB      │
└────────────────────┘
```

## Target Microservices Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Auth Service  │    │   Org Service   │    │   IAM Service   │
│                 │    │                 │    │                 │
│ - Identity      │    │ - Organizations │    │ - Roles         │
│ - Login/Reg     │    │ - Units         │    │ - Permissions   │
│ - OAuth         │    │ - Memberships   │    │ - Assignments   │
│ - Passkeys      │    │                 │    │                 │
│ - TOTP          │    └─────────────────┘    └─────────────────┘
└─────────────────┘             │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Auth DB         │    │ Org DB          │    │ IAM DB          │
│ (users, auth)   │    │ (orgs, units,   │    │ (roles, perms)  │
│                 │    │  memberships)   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘

┌─────────────────┐
│   Next.js BFF   │
│                 │
│ - API Gateway   │
│ - Token Val     │
│ - Route Proxy   │
│ - UI            │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│   Event Bus     │
│   (Kafka/NATS)  │
└─────────────────┘
```

## Service Boundaries

### Auth Service
- **Domain**: User identity, authentication methods
- **Tables**: users, user_identifiers, password_credentials, oauth_accounts, passkeys, authenticator_secrets, email_verification_otps
- **API Endpoints**: /auth/*
- **Events**: UserCreated, UserUpdated, UserDeleted

### Organization Service
- **Domain**: Multi-tenant organization structure
- **Tables**: organizations, organization_units, organization_memberships
- **API Endpoints**: /org/*
- **Events**: OrganizationCreated, MembershipAdded, MembershipRemoved

### IAM Service
- **Domain**: Roles and permissions
- **Tables**: roles, permissions, role_permissions, role_assignments
- **API Endpoints**: /iam/*
- **Events**: RoleAssigned, PermissionGranted

### BFF (Backend For Frontend)
- **Domain**: API composition, UI-specific logic
- **Responsibilities**: Token validation, request routing, data aggregation
- **No DB access**: Only calls microservices

## Migration Phases

### Phase 1: Service Extraction (Database Split)
1. Create separate DB schemas for each service
2. Implement data migration scripts
3. Deploy services with read-only access to monolith DB
4. Switch to service-specific DBs

### Phase 2: Event-Driven Communication
1. Implement event publishing in services
2. Add event subscribers for cross-service updates
3. Replace synchronous calls with events where appropriate

### Phase 3: API Gateway
1. Implement BFF as API gateway
2. Route requests to appropriate services
3. Handle cross-cutting concerns (auth, logging)

### Phase 4: Full Decoupling
1. Remove direct DB access from BFF
2. Implement service-to-service communication
3. Add circuit breakers and retries

## Event Contracts

### User Events
```json
{
  "event": "UserCreated",
  "data": {
    "userId": "uuid",
    "email": "string",
    "createdAt": "timestamp"
  }
}
```

```json
{
  "event": "UserAuthenticated",
  "data": {
    "userId": "uuid",
    "method": "password|oauth|passkey|totp",
    "orgId": "uuid?",
    "unitId": "uuid?"
  }
}
```

### Organization Events
```json
{
  "event": "MembershipCreated",
  "data": {
    "userId": "uuid",
    "orgId": "uuid",
    "unitId": "uuid?"
  }
}
```

### IAM Events
```json
{
  "event": "RoleAssigned",
  "data": {
    "userId": "uuid",
    "orgId": "uuid",
    "roleId": "uuid"
  }
}
```

## Migration Checklist

- [ ] Extract Auth Service
- [ ] Extract Org Service  
- [ ] Extract IAM Service
- [ ] Implement event bus
- [ ] Update BFF to use services
- [ ] Test end-to-end flows
- [ ] Performance optimization
- [ ] Monitoring and logging
- [ ] Rollback plan

## Benefits

- **Scalability**: Services can scale independently
- **Technology Diversity**: Different tech stacks per service
- **Team Autonomy**: Teams own their services
- **Fault Isolation**: Failure in one service doesn't affect others
- **Deployment Independence**: Deploy services without affecting others