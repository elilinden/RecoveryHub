insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ava.admin@example.test', crypt('RecoveryHub!234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ava Chen"}'),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'peter.partner@example.test', crypt('RecoveryHub!234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Peter Lawson"}'),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'eli.attorney@example.test', crypt('RecoveryHub!234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Eli Linden"}'),
  ('00000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'maya.staff@example.test', crypt('RecoveryHub!234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Maya Patel"}'),
  ('00000000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'blair.billing@example.test', crypt('RecoveryHub!234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Blair Monroe"}'),
  ('00000000-0000-4000-8000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'riley.readonly@example.test', crypt('RecoveryHub!234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Riley Quinn"}')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name, role, job_title, is_active)
values
  ('00000000-0000-4000-8000-000000000001', 'ava.admin@example.test', 'Ava Chen', 'admin', 'Operations Administrator', true),
  ('00000000-0000-4000-8000-000000000002', 'peter.partner@example.test', 'Peter Lawson', 'partner', 'Partner', true),
  ('00000000-0000-4000-8000-000000000003', 'eli.attorney@example.test', 'Eli Linden', 'attorney', 'Attorney', true),
  ('00000000-0000-4000-8000-000000000004', 'maya.staff@example.test', 'Maya Patel', 'staff', 'Recovery Specialist', true),
  ('00000000-0000-4000-8000-000000000005', 'blair.billing@example.test', 'Blair Monroe', 'billing', 'Billing Analyst', true),
  ('00000000-0000-4000-8000-000000000006', 'riley.readonly@example.test', 'Riley Quinn', 'read_only', 'Read Only Reviewer', true)
on conflict (id) do update
set full_name = excluded.full_name, role = excluded.role, job_title = excluded.job_title, is_active = excluded.is_active;

insert into public.carriers (id, name, short_name, reporting_preferences)
values
  ('10000000-0000-4000-8000-000000000001', 'Northstar Mutual', 'Northstar', '{"cadence":"monthly"}'),
  ('10000000-0000-4000-8000-000000000002', 'Summit Casualty', 'Summit', '{"cadence":"biweekly"}'),
  ('10000000-0000-4000-8000-000000000003', 'Evergreen Indemnity', 'Evergreen', '{"cadence":"monthly"}'),
  ('10000000-0000-4000-8000-000000000004', 'Pioneer Risk', 'Pioneer', '{"cadence":"quarterly"}')
on conflict (id) do nothing;

insert into public.carrier_contacts (id, carrier_id, full_name, email, job_title, contact_type, supervisor_contact_id)
values
  ('11000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Renee Hollis', 'renee.hollis@example.test', 'Claims Adjuster', 'adjuster', null),
  ('11000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Graham Porter', 'graham.porter@example.test', 'Claims Supervisor', 'supervisor', null),
  ('11000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'Owen Mercer', 'owen.mercer@example.test', 'Property Adjuster', 'adjuster', null),
  ('11000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'Lena Ortiz', 'lena.ortiz@example.test', 'Claims Supervisor', 'supervisor', null),
  ('11000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000003', 'Iris Bell', 'iris.bell@example.test', 'Senior Adjuster', 'adjuster', null),
  ('11000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000003', 'Marcus Vale', 'marcus.vale@example.test', 'Claims Manager', 'claims_manager', null),
  ('11000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000004', 'Theo Grant', 'theo.grant@example.test', 'Adjuster', 'adjuster', null),
  ('11000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000004', 'Sasha Kim', 'sasha.kim@example.test', 'Supervisor', 'supervisor', null)
on conflict (id) do nothing;

update public.carrier_contacts set supervisor_contact_id = '11000000-0000-4000-8000-000000000002' where id = '11000000-0000-4000-8000-000000000001';
update public.carrier_contacts set supervisor_contact_id = '11000000-0000-4000-8000-000000000004' where id = '11000000-0000-4000-8000-000000000003';
update public.carrier_contacts set supervisor_contact_id = '11000000-0000-4000-8000-000000000006' where id = '11000000-0000-4000-8000-000000000005';
update public.carrier_contacts set supervisor_contact_id = '11000000-0000-4000-8000-000000000008' where id = '11000000-0000-4000-8000-000000000007';

insert into public.organizations (id, name, organization_type, city, state)
values
  ('12000000-0000-4000-8000-000000000001', 'Cedar Ridge Apartments', 'business', 'Haven', 'NY'),
  ('12000000-0000-4000-8000-000000000002', 'Metro Fleet Services', 'business', 'Westport', 'NJ'),
  ('12000000-0000-4000-8000-000000000003', 'Fairlane Repair Group', 'repair_facility', 'Briar', 'PA')
on conflict (id) do nothing;

insert into public.contacts (id, first_name, last_name, email, organization_id, notes)
values
  ('13000000-0000-4000-8000-000000000001', 'Nolan', 'Reed', 'nolan.reed@example.test', null, 'Fictional responsible party.'),
  ('13000000-0000-4000-8000-000000000002', 'Kira', 'Stone', 'kira.stone@example.test', '12000000-0000-4000-8000-000000000001', 'Fictional property contact.'),
  ('13000000-0000-4000-8000-000000000003', 'Drew', 'Hale', 'drew.hale@example.test', '12000000-0000-4000-8000-000000000002', 'Fictional witness.')
on conflict (id) do nothing;

insert into public.matters (
  id, carrier_id, assigned_adjuster_id, carrier_supervisor_id, matter_name, carrier_claim_number,
  firm_matter_number, matter_type, date_referred, date_of_loss, jurisdiction, insurance_status,
  amount_paid, deductible, amount_sought, amount_recovered, stage, priority, next_action,
  next_action_due_date, statute_deadline, statute_deadline_verified, statute_deadline_verified_by,
  statute_deadline_verified_at, assigned_attorney_id, assigned_staff_id, internal_notes, created_by,
  last_substantive_activity_at
)
values
  ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000002','Northstar Mutual v. Collins','NSM-48291-26','RH-2026-001','auto_subrogation','2026-06-20','2026-05-18','NY','confirmed_coverage',39000,3750,42750,0,'ready_for_demand','high','Finalize demand package','2026-07-05','2026-07-10',true,'00000000-0000-4000-8000-000000000003',now(),'00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004','Fictional seed note for strategy review.','00000000-0000-4000-8000-000000000001','2026-07-02'),
  ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000004','Harbor Bend Storage Loss','SC-77104-26','RH-2026-002','property_damage','2026-06-10','2026-05-08','NJ','identified_unconfirmed',16000,2400,18400,0,'investigation','urgent','Request signed proof of loss','2026-07-01','2026-07-08',false,null,null,'00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004','Fictional missing-document file.','00000000-0000-4000-8000-000000000001','2026-06-18'),
  ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000005','11000000-0000-4000-8000-000000000006','Lakeview Delivery Collision','EGI-19577-25','RH-2026-003','commercial_loss','2026-05-15','2026-03-20','PA','confirmed_coverage',72000,4500,76500,18500,'negotiation','high','Respond to counteroffer','2026-07-06','2026-07-15',true,'00000000-0000-4000-8000-000000000002',now(),'00000000-0000-4000-8000-000000000003',null,'Fictional negotiation file.','00000000-0000-4000-8000-000000000002','2026-07-03'),
  ('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000004','11000000-0000-4000-8000-000000000007','11000000-0000-4000-8000-000000000008','Cedar Ridge Water Damage','PR-66012-26','RH-2026-004','property_damage','2026-05-25','2026-04-02','NY','unknown',26000,3225,29225,0,'investigation','normal','Confirm maintenance vendor identity','2026-07-09','2026-07-18',true,'00000000-0000-4000-8000-000000000003',now(),'00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000004','Fictional stale matter seed.','00000000-0000-4000-8000-000000000001','2026-06-02'),
  ('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000002','Metro Fleet Rear-End Loss','BCN-30618-26','RH-2026-005','auto_subrogation','2026-07-01','2026-06-25','NY','confirmed_coverage',12100,1000,13100,0,'new_referral','normal','Complete intake triage','2026-07-04','2026-07-12',false,null,null,'00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004','Fictional new referral.','00000000-0000-4000-8000-000000000001','2026-07-02'),
  ('20000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000004','Oak Terrace Fire Deductible','CRA-92044-25','RH-2026-006','property_damage','2026-03-02','2026-01-18','NJ','confirmed_coverage',96000,2500,98500,61500,'litigation_review','low','Review settlement authority','2026-07-21','2026-08-01',true,'00000000-0000-4000-8000-000000000002',now(),'00000000-0000-4000-8000-000000000002',null,'Fictional high-value matter.','00000000-0000-4000-8000-000000000002','2026-06-28'),
  ('20000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000005','11000000-0000-4000-8000-000000000006','Fairlane Contractor Overpayment','MCL-11803-26','RH-2026-007','commercial_loss','2026-04-12','2026-02-14','PA','unknown',20000,2300,22300,0,'initial_review','normal','Confirm recovery target','2026-07-11','2026-07-24',true,'00000000-0000-4000-8000-000000000003',now(),'00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004','Fictional awaiting response file.','00000000-0000-4000-8000-000000000001','2026-06-03'),
  ('20000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000004','11000000-0000-4000-8000-000000000007','11000000-0000-4000-8000-000000000008','Brookfield Glass Impact','AG-55820-26','RH-2026-008','property_damage','2026-02-10','2026-01-08','NJ','confirmed_coverage',8700,0,8700,8700,'closed','low','Archive matter summary','2026-08-14','2026-08-14',true,'00000000-0000-4000-8000-000000000002',now(),'00000000-0000-4000-8000-000000000002',null,'Fictional closed matter.','00000000-0000-4000-8000-000000000002','2026-06-26'),
  ('20000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000004','Rivergate Slip Loss','SC-88420-26','RH-2026-009','commercial_loss','2026-04-18','2026-03-01','NY','unknown',48000,3200,51200,0,'initial_review','normal',null,null,'2026-09-02',true,'00000000-0000-4000-8000-000000000003',now(),'00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000004','Fictional missing next action.','00000000-0000-4000-8000-000000000001','2026-05-28'),
  ('20000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000005','11000000-0000-4000-8000-000000000006','Summit Road Equipment Loss','EGI-44010-26','RH-2026-010','product_related_loss','2026-06-08','2026-05-09','PA','identified_unconfirmed',34000,2000,36000,0,'demand_pending','high','Send demand follow-up','2026-07-12','2026-10-01',true,'00000000-0000-4000-8000-000000000003',now(),'00000000-0000-4000-8000-000000000003',null,'Fictional demand pending matter.','00000000-0000-4000-8000-000000000001','2026-06-25'),
  ('20000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000004','11000000-0000-4000-8000-000000000007','11000000-0000-4000-8000-000000000008','Pioneer Warehouse Forklift Loss','PR-77152-26','RH-2026-011','commercial_loss','2026-06-14','2026-05-30','NY','confirmed_coverage',58000,5000,63000,0,'ready_for_demand','urgent','Partner demand review','2026-07-03','2026-11-12',false,null,null,'00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000004','Fictional urgent unverified deadline.','00000000-0000-4000-8000-000000000001','2026-06-30'),
  ('20000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000002','Northstar Plan Recovery','NSM-99102-26','RH-2026-012','health_plan_recovery','2026-05-01','2026-04-01','NJ','confirmed_coverage',15500,0,15500,0,'investigation','normal','Request plan document','2026-07-19','2027-04-01',true,'00000000-0000-4000-8000-000000000003',now(),'00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004','Fictional health-plan extension seed.','00000000-0000-4000-8000-000000000001','2026-06-22')
on conflict (id) do nothing;

insert into public.matter_assignments (matter_id, profile_id, assignment_role)
values
  ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','lead_attorney'),
  ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004','assigned_staff'),
  ('20000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000005','billing'),
  ('20000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000006','reviewer')
on conflict do nothing;

insert into public.matter_parties (matter_id, contact_id, organization_id, party_role, is_primary, notes)
values
  ('20000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-000000000001',null,'responsible_party',true,'Fictional adverse driver.'),
  ('20000000-0000-4000-8000-000000000004',null,'12000000-0000-4000-8000-000000000001','responsible_party',true,'Fictional property manager.'),
  ('20000000-0000-4000-8000-000000000005','13000000-0000-4000-8000-000000000003',null,'witness',false,'Fictional witness.');

insert into public.evidence_items (matter_id, evidence_type, status, date_requested, date_received, notes, created_by)
values
  ('20000000-0000-4000-8000-000000000001','police_or_incident_report','received','2026-06-22','2026-06-29','Seed report received.','00000000-0000-4000-8000-000000000004'),
  ('20000000-0000-4000-8000-000000000002','payment_ledger','missing','2026-06-20',null,'Ledger still missing.','00000000-0000-4000-8000-000000000004'),
  ('20000000-0000-4000-8000-000000000011','repair_invoice','received','2026-06-20','2026-06-24','Invoice supports demand.','00000000-0000-4000-8000-000000000004');

insert into public.tasks (matter_id, title, assigned_to, due_date, priority, status, created_by)
values
  ('20000000-0000-4000-8000-000000000001','Finalize demand package','00000000-0000-4000-8000-000000000004','2026-07-05','high','in_progress','00000000-0000-4000-8000-000000000003'),
  ('20000000-0000-4000-8000-000000000002','Request signed proof of loss','00000000-0000-4000-8000-000000000004','2026-07-01','urgent','blocked','00000000-0000-4000-8000-000000000003'),
  ('20000000-0000-4000-8000-000000000009','Assign next action','00000000-0000-4000-8000-000000000003',null,'normal','not_started','00000000-0000-4000-8000-000000000002');

insert into public.deadlines (matter_id, deadline_type, title, deadline_date, is_verified, verified_by, verified_at, assigned_to, created_by)
values
  ('20000000-0000-4000-8000-000000000001','statute_of_limitations','Statute deadline','2026-07-10',true,'00000000-0000-4000-8000-000000000003',now(),'00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002','statute_of_limitations','Statute deadline','2026-07-08',false,null,null,'00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000011','statute_of_limitations','Statute deadline','2026-11-12',false,null,null,'00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001');

insert into public.matter_events (matter_id, event_type, occurred_at, recorded_by, source, description, metadata)
values
  ('20000000-0000-4000-8000-000000000001','document_received','2026-07-02','00000000-0000-4000-8000-000000000004','manual','Police report received.','{"evidence":"police_report"}'),
  ('20000000-0000-4000-8000-000000000003','offer_received','2026-07-03','00000000-0000-4000-8000-000000000003','manual','Counteroffer received.','{"amount":18500}'),
  ('20000000-0000-4000-8000-000000000008','matter_closed','2026-06-26','00000000-0000-4000-8000-000000000002','manual','Recovery posted and matter closed.','{}');

insert into public.activity_logs (matter_id, actor_id, action_type, entity_type, entity_id, description, previous_value, new_value)
values
  ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004','create','evidence_item',null,'Evidence record created.',null,'{"status":"received"}'),
  ('20000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000003','update','matter',null,'Negotiation note added.',null,'{"stage":"negotiation"}');

insert into public.saved_views (id, profile_id, name, page, filter_configuration, is_shared)
values
  ('30000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','Needs Follow-Up','matters','{"conditions":["overdue_next_action","stale_matter","unverified_statute_deadline"]}',true),
  ('30000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000004','My Adjuster Follow-Ups','matters','{"assigned_adjuster":"Owen Mercer"}',false)
on conflict (id) do nothing;

insert into public.external_references (entity_type, entity_id, system_name, external_id, external_url, sync_status)
values
  ('matter','20000000-0000-4000-8000-000000000001','Fictional Claims System','NSM-48291-26','https://claims.example.test/NSM-48291-26','not_synced'),
  ('carrier','10000000-0000-4000-8000-000000000002','Fictional Carrier Directory','SUMMIT','https://directory.example.test/summit','pending')
on conflict do nothing;

insert into public.client_updates (matter_id, title, summary, visibility_status, approved_by, approved_at, published_at, created_by)
values
  ('20000000-0000-4000-8000-000000000001','Demand package prepared','Internal draft update for future client reporting.','client_eligible',null,null,null,'00000000-0000-4000-8000-000000000003'),
  ('20000000-0000-4000-8000-000000000003','Counteroffer received','Internal update awaiting approval before any external use.','internal',null,null,null,'00000000-0000-4000-8000-000000000003');
