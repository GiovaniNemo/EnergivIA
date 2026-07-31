INSERT INTO "Category" (id, name) VALUES ('clzcat0000000000000000001', 'profile') ON CONFLICT (name) DO NOTHING;
INSERT INTO "Category" (id, name) VALUES ('clzcat0000000000000000002', 'string_box') ON CONFLICT (name) DO NOTHING;
