# PRD — Módulo Gobierno y Seguridad Tenant Erpico

**Nombre técnico:** `erpico_tenant_governance`  
**Target:** Odoo Community 19  
**Instalación:** base matriz y cada tenant. **Prohibido:** Odoo central/control plane.  
**Versión inicial:** `19.0.1.0.0`

---

## 1. Propósito

Entregar capa funcional de gobierno, permisos y restricciones para cada tenant Erpico. Un tenant debe nacer con roles retail definidos, mínimo privilegio, gestión segura de usuarios, navegación controlada y soporte Habitat temporal/auditado.

Este módulo complementa, nunca sustituye, aislamiento de infraestructura:

```text
base PostgreSQL independiente + filestore independiente
+ dbfilter restringido por host + list_db=False
+ routing/TLS/proxy validados + worker externo privilegiado
```

Ocultar menú nunca equivale a bloquear capacidad. Restricciones se aplican mediante grupos, ACL, record rules, validaciones servidor y pruebas negativas.

## 2. Fuentes obligatorias

Leer antes de cambiar código:

1. `Specs/PRD_Habitat_Digital_SaaS.md`
2. `Specs/ESPECIFICACION_BASE_MATRIZ_ERPICO.md`
3. `Specs/PLAN_DESARROLLO_FASE_1.md`
4. `Specs/FASE_1A_CONTRATOS_TECNICOS.md`
5. `Specs/INSTRUCCIONES_AGENTE_MODULO_ERPICO.md`
6. `Specs/MATRIZ_RACI_SOPORTE_ESCALAMIENTO.md`
7. `Specs/CHECKLIST_PROMOCION_AMBIENTES.md`
8. `Specs/MODULO_ODOO_CENTRAL_ERPICO.md`

Ante contradicción: detener alcance afectado; reportar documento/sección, impacto, alternativas mínimas y decisión requerida. No inferir requisitos.

## 3. Problema

Odoo Community incluye grupos por aplicación, pero Erpico necesita producto SaaS retail controlado:

- Cajero opera POS sin configuración, usuarios, módulos o servidor.
- Supervisor autoriza operaciones POS definidas sin administrar infraestructura.
- Administrador cliente gestiona operación comercial y usuarios comerciales sin privilegios técnicos.
- Soporte Habitat accede solo temporalmente, con motivo, aprobación, expiración y auditoría.
- Cliente no instala módulos, gestiona bases, modifica configuración técnica ni accede a otro tenant.
- Interfaz muestra solo capacidades MVP permitidas por rol.

## 4. Objetivos

1. Definir roles tenant explícitos.
2. Aplicar acceso mínimo mediante grupos, ACL, record rules y validaciones servidor.
3. Controlar menús y acciones por rol.
4. Permitir gestión segura de usuarios comerciales.
5. Implementar soporte Habitat temporal, revocable y auditable.
6. Bloquear capacidades técnicas funcionales no autorizadas.
7. Probar rutas positivas y negativas automatizadamente.

## 5. Alcance MVP

### Incluido

```text
- Roles Erpico tenant y herencia mínima de grupos nativos.
- ACL, record rules y validaciones servidor.
- Creación, edición, archivo y asignación restringida de usuarios comerciales.
- Menús y acciones permitidas por rol.
- Bloqueo funcional de capacidades técnicas no autorizadas.
- Grants temporales de soporte Habitat y auditoría.
- XML, migraciones, tests y documentación reproducibles.
```

### Fuera de alcance

```text
- Crear, clonar, suspender, restaurar o borrar bases.
- PostgreSQL, filestore, proxy, DNS, TLS, dbfilter, list_db o secretos.
- Control plane, tenants globales, planes, Stripe, webhooks, jobs o worker.
- Lógica fiscal, IA, módulos ERP nuevos o Enterprise.
- Modificar código upstream Odoo.
- Límites comerciales por plan, salvo consulta no autoritativa.
```

## 6. Arquitectura

```text
Odoo central
└── erpico_saas_control
    └── Nunca depende de governance.

Matriz y tenant
├── erpico_debranding
├── erpico_debranding_pos
├── erpico_debranding_sale          # Solo si portal Sales/Purchase queda habilitado.
├── erpico_web_sidebar              # UX; nunca frontera de seguridad.
├── erpico_web_sidebar_roles        # Referencia; migrar o sustituir gradualmente.
└── erpico_tenant_governance
```

### Dependencias esperadas

Declarar solo módulos usados. Base esperada:

```python
'depends': [
    'base', 'mail', 'sale', 'purchase', 'stock',
    'point_of_sale', 'website', 'website_sale',
]
```

Reglas:

- No depender de `erpico_saas_control` ni Enterprise.
- Seguridad debe funcionar si sidebar no está instalado.
- Función que dependa de addon opcional vive en extensión separada o requiere decisión documentada.

### Estructura objetivo

```text
erpico_tenant_governance/
├── __init__.py
├── __manifest__.py
├── README.md
├── models/
│   ├── res_users.py
│   ├── support_access_grant.py
│   └── audit_log.py                # Solo si no se usa mecanismo Odoo equivalente.
├── wizard/
│   ├── support_access_grant_wizard.py
│   └── user_management_wizard.py   # Solo si necesario.
├── security/
│   ├── groups.xml
│   ├── ir.model.access.csv
│   └── record_rules.xml
├── data/
│   ├── menus.xml
│   ├── cron.xml
│   └── configuration.xml
├── views/
├── tests/
└── migrations/
```

No crear modelos, campos o wizards sin justificación en README y pruebas.

## 7. Roles requeridos

| XML ID | Rol | Propósito |
|---|---|---|
| `group_erpico_cashier` | Cajero | Opera POS y caja asignada. |
| `group_erpico_supervisor` | Supervisor | Supervisa caja y autoriza operaciones POS permitidas. |
| `group_erpico_commercial_user` | Usuario comercial | Opera ventas, contactos y funciones comerciales asignadas. |
| `group_erpico_customer_admin` | Administrador cliente | Gestiona operación comercial y usuarios comerciales restringidos. |
| `group_erpico_support` | Soporte Habitat | Soporte temporal, justificado y auditado. |
| `group_erpico_tenant_readonly` | Consulta tenant | Consulta limitada QA/soporte, si se aprueba. |

### Principios

- Rol Erpico hereda solo grupos nativos imprescindibles.
- Ningún rol tenant hereda `base.group_system`, administración de bases, instalación de módulos, grupos técnicos, acceso a secretos o permisos para otorgar grupos técnicos.
- No usar `sudo()` para omitir política sin justificación, auditoría y prueba.
- Documentar cada `implied_ids` en XML y README.
- Validar grupos POS nativos Odoo 19: no usar `point_of_sale.group_pos_manager` si concede capacidades fuera de matriz aprobada.

## 8. Matriz mínima de permisos

| Capacidad | Cajero | Supervisor | Comercial | Admin cliente | Soporte |
|---|---:|---:|---:|---:|---:|
| Abrir sesión POS asignada | Sí | Sí | No* | Configurable | Grant activo |
| Venta POS | Sí | Sí | No* | Configurable | No por defecto |
| Devolución y autorización | Política POS | Sí | No | Configurable | No por defecto |
| Cierre, arqueo y diferencias | Propio/asignado | Sí | No | Consulta/configuración | Diagnóstico autorizado |
| Productos y precios | Consulta | Consulta limitada | Según ventas | Sí | Grant activo |
| Inventario | No** | Consulta | No** | Sí | Grant activo |
| Compras/proveedores | No | No | No | Sí | Grant activo |
| Website/ecommerce | No | No | Según asignación | Sí, alcance MVP | Grant activo |
| Contactos/ventas | Consulta mínima | Consulta mínima | Sí | Sí | Grant activo |
| Crear usuarios comerciales | No | No | No | Sí, flujo restringido | No |
| Asignar grupos técnicos | No | No | No | No | No |
| Módulos/configuración técnica/base DB | No | No | No | No | No |

\* Solo si recibe rol POS aprobado.  
\** Salvo consulta explícitamente necesaria y aprobada.

Matriz final debe verificarse contra Odoo Community 19 y convertirse en pruebas automatizadas.

## 9. Gestión segura de usuarios

Administrador cliente solo gestiona usuarios comerciales tenant:

- Puede crear, editar, archivar y reactivar usuario con roles allowlist.
- No crea ni edita soporte Habitat.
- No asigna `base.group_system`, grupos técnicos, Apps, módulos, servidor o grupos fuera allowlist.
- No modifica propia membresía para escalar privilegios.
- No cambia compañía fuera tenant.
- No reactiva usuario con roles prohibidos.
- No modifica parámetros sistema, autenticación, proveedores técnicos o compañías globales.

### Implementación

Opción preferida:

```text
Wizard Erpico gestión usuarios
+ roles explícitamente asignables
+ validación servidor create/write/group_ids/archive
+ auditoría actor, antes/después y UTC
```

Alternativa: vista restringida de `res.users`, validaciones equivalentes, ACL y record rules probadas. Campos invisibles XML nunca son control suficiente.

### Roles asignables por admin cliente

```text
Permitidos: Cajero, Supervisor, Usuario comercial, roles retail aprobados.
Prohibidos: System admin, Soporte Habitat, grupos técnicos, grupos módulos/apps, grupos fuera allowlist.
```

## 10. Soporte Habitat temporal y auditado

Soporte no tiene acceso permanente generalizado a tenant productivo.

### Modelo sugerido

`erpico.support.access.grant` con:

```text
tenant_reference / tenant actual
support_user_id
reason
requester_id
approver_id
starts_at UTC
expires_at UTC
scope_role_id
state
ticket_or_incident_ref
revoked_by
revocation_reason
```

### Estados

```text
requested → approved → active → expired
                   └→ revoked
requested → rejected
```

### Reglas

- Grant vencido no permite acceso.
- Cron desactiva/revoca expirados idempotentemente.
- Revocación manual inmediata.
- Soporte no autoaprueba acceso.
- Extensión exige nuevo motivo, aprobador y evento auditado.
- Grant nunca contiene contraseñas, tokens, secretos ni datos infraestructura.
- Auditoría conserva actor, timestamps y transiciones.
- Política de aprobación se define por Habitat/provisioning, no usuario cliente común.
- Soporte no instala módulos, administra DB, cambia infraestructura, accede secretos, cambia billing/lifecycle ni se otorga permisos.

## 11. Menús y UX

Usuarios tenant ven solo capacidades MVP permitidas:

```text
POS, Ventas, Productos, Inventario, Compras, Ecommerce/Website,
Contactos, reportes nativos aprobados y gestión de usuarios comerciales
para administrador cliente.
```

Bloquear u ocultar según rol:

```text
Apps, Ajustes técnicos, administración módulos, database manager,
parámetros sistema, menús técnicos, herramientas desarrollador,
Enterprise/comercial no aplicable y acciones masivas no aprobadas.
```

`erpico_web_sidebar` es UX. Governance debe funcionar sin él. Acción bloqueada debe rechazar en servidor aunque URL, RPC o sidebar intenten abrirla. Si hace falta integración, crear addon opcional `erpico_tenant_governance_sidebar`; no dependencia inversa.

## 12. Restricciones funcionales obligatorias

1. Tenant no accede a database manager, selector DB, backup, restore, clone, drop o create DB.
2. Tenant no instala, actualiza ni desinstala módulos.
3. Tenant no accede a parámetros técnicos sensibles.
4. Tenant no crea, administra ni eleva usuarios técnicos.
5. Tenant no obtiene grupos fuera allowlist.
6. Tenant no modifica secretos, credenciales o configuración infraestructura.
7. Menú visible nunca concede permiso real.
8. Módulo no afirma aislamiento SaaS si infraestructura no prueba base/filestore/dbfilter/routing.

No guardar secretos, contraseñas, tokens, API keys, claves privadas o credenciales en modelos, XML, fixtures, logs o documentación.

## 13. ACL, record rules y validaciones servidor

### ACL

Definir acceso deny-by-default para:

- `res.users` mediante flujo restringido;
- `erpico.support.access.grant`, si existe;
- auditoría propia, si existe;
- wizards requeridos.

No otorgar `unlink` sin caso probado. Usar solo permisos mínimos.

### Record rules

- Admin cliente gestiona solo usuarios permitidos tenant actual.
- Soporte opera solo con grant activo y alcance autorizado.
- Auditoría visible solo para roles autorizados.
- Usuarios funcionales no acceden registros gobierno fuera necesidad.
- Multi-company no se declara como aislamiento SaaS; aislamiento principal es base por tenant.

### Validaciones servidor

Validar actor, target, grupos, grant y compañía/tenant en:

```text
res.users.create
res.users.write
res.users.unlink/archive
asignación group_ids
activación/reactivación usuario
creación/revocación support grant
```

## 14. Auditoría

Auditar como mínimo:

```text
- Crear, editar, archivar/reactivar usuario comercial.
- Cambio de rol.
- Intento bloqueado asignación grupo prohibido.
- Solicitud, aprobación, activación, expiración y revocación soporte.
- Cambio política sensible.
- Acción administrativa permitida administrador cliente.
```

Campos mínimos:

```text
actor_id
target_user_id
event_type
timestamp_utc
previous_value_sanitized
new_value_sanitized
reason
ticket_or_incident_ref
support_grant_id
```

Auditoría no es editable por administrador cliente. No registrar contraseñas, tokens, secretos ni payloads sensibles. No sobrescribir historia. Retención sigue contrato de producto existente.

## 15. Requisitos no funcionales

- Odoo Community 19 y commit fijado proyecto.
- Convenciones Odoo/OCA, ORM, constraints, traducciones, XML válido y licencia `LGPL-3`.
- Sin SQL directo salvo aprobación explícita.
- Sin datos reales en pruebas.
- Sin pasos manuales no versionados post-provisioning.
- Logs sanitizados; errores no filtran secretos, estructura o datos de otros usuarios.
- Cambios versionados, migraciones explícitas e idempotentes.

## 16. Tests obligatorios

Ejecutar con Odoo Community 19 fijado y datos sintéticos.

### Roles

- Cajero realiza operaciones POS permitidas; no gestiona productos, usuarios, módulos ni configuración.
- Supervisor realiza autorización POS aprobada; no administra infraestructura, módulos ni grupos técnicos.
- Comercial solo opera ventas/contactos permitidos.
- Admin cliente opera dentro límites y no autoescala privilegios.
- Soporte sin grant no accede; con grant solo alcance autorizado; vencido/revocado pierde acceso.

### Usuarios

- Admin cliente crea y archiva usuario comercial permitido.
- No crea usuario técnico ni soporte Habitat.
- No asigna `base.group_system` ni grupos no permitidos.
- No edita usuario soporte.
- RPC directo, importación y acción masiva no evaden política.

### Menús/acciones

- Menú no permitido no aparece.
- Acción no permitida falla mediante URL y RPC directo.
- Apps, Settings y administración técnica no accesibles por rol tenant.
- Sidebar instalado no muestra ruta que rol no puede ejecutar.
- “Todas las aplicaciones” no expone acción utilizable fuera permisos.

### Regresión e integración

- Instalación limpia en matriz sintética.
- Upgrade conserva grupos y grants válidos sin otorgar privilegios nuevos.
- Desinstalación no deja grupos técnicos asignados.
- Tests con `erpico_debranding` y `erpico_web_sidebar` pasan sin conflicto crítico.

## 17. Criterios de aceptación

- [ ] Instala en Odoo 19 limpio con módulos MVP aprobados.
- [ ] Define Cajero, Supervisor, Comercial, Admin cliente y Soporte Habitat.
- [ ] Herencias nativas están documentadas y justificadas.
- [ ] Ningún rol tenant hereda `base.group_system`.
- [ ] Matriz de permisos pasa pruebas positivas y negativas.
- [ ] Admin cliente no crea/eleva usuario técnico y solo asigna allowlist.
- [ ] Soporte requiere grant temporal con motivo, aprobación, expiración y auditoría.
- [ ] Grant vencido/revocado elimina acceso.
- [ ] Tenant no instala módulos ni accede a configuración técnica o administración DB.
- [ ] Menús/acciones no autorizadas fallan en servidor.
- [ ] No hay secretos, tokens, contraseñas ni datos reales.
- [ ] Tests automatizados pasan contra Odoo Community 19 fijado.
- [ ] Pruebas conjuntas de debranding/sidebar/governance pasan.
- [ ] README cubre instalación, configuración, matriz permisos, pruebas, límites y rollback.
- [ ] Matriz reproduce configuración sin pasos manuales no versionados.
- [ ] Revisión humana aprueba grupos, ACL, record rules y validaciones servidor.

## 18. Entregables

```text
- Addon erpico_tenant_governance.
- Manifest, README, licencia y changelog.
- Grupos, ACL, record rules, vistas y datos XML.
- Gestión restringida usuarios comerciales.
- Grants soporte temporales auditados.
- Tests Odoo automatizados.
- Matriz de permisos y evidencia sanitizada.
- Nota decisiones, riesgos y límites.
```

No entregar credenciales, secretos, datos reales, scripts privilegiados infraestructura, cambios upstream Odoo, Stripe, control plane o worker.

## 19. Orden de implementación

1. Confirmar matriz funcional y decisiones POS nativas.
2. Crear manifest, estructura y grupos vacíos.
3. Implementar roles y dependencias mínimas.
4. Implementar ACL/record rules deny-by-default.
5. Implementar validaciones `res.users`.
6. Implementar grants soporte y auditoría.
7. Implementar menús/restricciones.
8. Crear primero pruebas de escalamiento de privilegios.
9. Ejecutar regresión con sidebar/debranding.
10. Probar instalación matriz sintética.
11. Realizar revisión humana de seguridad.
12. Promover solo por proceso aprobado; nunca editar producción manualmente.

## 20. Definition of Done

Entrega terminada solo si código es versionado/reproducible, pruebas pasan, ACL/record rules/validaciones fueron revisadas, no existe bypass conocido por UI/RPC/importación/URL, evidencia sanitizada está adjunta, riesgos quedan registrados y revisión humana aprueba seguridad. No declarar despliegue, hardening o aislamiento sin evidencia operativa.

## 21. Decisión para módulos existentes

`erpico_web_sidebar_roles` es referencia, no dependencia obligatoria. IA evalúa y documenta una ruta:

1. Reemplazar gradualmente roles actuales por `erpico_tenant_governance`.
2. Extender roles actuales y moverlos al mismo repositorio/addons path.

**Ruta recomendada:** reemplazo gradual. Roles actuales son por aplicación; Erpico requiere roles operativos completos con seguridad en servidor.
