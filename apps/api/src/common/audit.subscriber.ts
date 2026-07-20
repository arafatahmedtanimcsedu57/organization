import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntitySubscriberInterface, InsertEvent, RemoveEvent, UpdateEvent } from 'typeorm';
import { Employee } from '../employees/employee.entity.ts';
import { Department } from '../departments/department.entity.ts';
import { Assignment } from '../assignments/assignment.entity.ts';
import { ChangeLog } from '../history/change-log.entity.ts';
import type { ChangeLogEntityType } from '../history/change-log.entity.ts';
import { entityIdOf, resolveUpdateAction } from './audit.logic.ts';

const AUDITED_ENTITY_TYPES = new Map<Function, ChangeLogEntityType>([
  [Employee, 'employee'],
  [Department, 'department'],
  [Assignment, 'assignment'],
]);

/** No auth/actor context exists yet (see design.md open question "Auth"); recorded as a fixed placeholder until one lands. */
const SYSTEM_ACTOR = 'system';

/**
 * `change-history` capability: a TypeORM subscriber that writes an
 * append-only `ChangeLog` row for every create/update/deactivate on the
 * audited masters (employees, departments, assignments), so feature services
 * never have to log writes themselves (design.md §3, §4).
 *
 * Registered by pushing onto `dataSource.subscribers` rather than the
 * `@EventSubscriber()` decorator's auto-discovery, so it can receive its
 * `DataSource` via normal Nest DI.
 */
@Injectable()
export class AuditSubscriber implements EntitySubscriberInterface {
  constructor(private readonly dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  async afterInsert(event: InsertEvent<unknown>): Promise<void> {
    const entityType = AUDITED_ENTITY_TYPES.get(event.metadata.target as Function);
    if (!entityType || !event.entity) return;

    await event.manager.getRepository(ChangeLog).insert({
      entity: entityType,
      entityId: entityIdOf(event.entity as Record<string, unknown>),
      action: 'create',
      actor: SYSTEM_ACTOR,
      before: null,
      after: event.entity,
    });
  }

  async afterUpdate(event: UpdateEvent<unknown>): Promise<void> {
    const entityType = AUDITED_ENTITY_TYPES.get(event.metadata.target as Function);
    if (!entityType || !event.entity || !event.databaseEntity) return;

    const action = resolveUpdateAction(
      event.updatedColumns.map((column) => column.propertyName),
      event.entity as Record<string, unknown>,
    );

    await event.manager.getRepository(ChangeLog).insert({
      entity: entityType,
      entityId: entityIdOf(event.entity as Record<string, unknown>),
      action,
      actor: SYSTEM_ACTOR,
      before: event.databaseEntity,
      after: event.entity,
    });
  }

  /** Assignments have no `active` flag — removal is their only delete-like write, so it's logged as a deactivation. */
  async afterRemove(event: RemoveEvent<unknown>): Promise<void> {
    const entityType = AUDITED_ENTITY_TYPES.get(event.metadata.target as Function);
    const removed = event.databaseEntity ?? event.entity;
    if (!entityType || !removed) return;

    await event.manager.getRepository(ChangeLog).insert({
      entity: entityType,
      entityId: entityIdOf(removed as Record<string, unknown>),
      action: 'deactivate',
      actor: SYSTEM_ACTOR,
      before: removed,
      after: null,
    });
  }
}
