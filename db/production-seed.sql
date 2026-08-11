--
-- PostgreSQL database dump
--


-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.chat_messages (id, session_id, sender_id, sender_role, message, is_read, created_at) VALUES (1, 1, 3, 'user', 'Hello', true, '2026-08-03 21:30:05.280298+00');
INSERT INTO public.chat_messages (id, session_id, sender_id, sender_role, message, is_read, created_at) VALUES (2, 1, 3, 'user', 'I need help', true, '2026-08-03 21:30:13.494746+00');
INSERT INTO public.chat_messages (id, session_id, sender_id, sender_role, message, is_read, created_at) VALUES (3, 1, 3, 'user', 'Hello i need help', true, '2026-08-03 22:02:18.991012+00');
INSERT INTO public.chat_messages (id, session_id, sender_id, sender_role, message, is_read, created_at) VALUES (4, 1, 1, 'admin', 'Thanks for reaching out! I''ll look into this shortly.', false, '2026-08-03 22:03:02.010991+00');
INSERT INTO public.chat_messages (id, session_id, sender_id, sender_role, message, is_read, created_at) VALUES (5, 4, 10, 'user', 'Is there an app for this', false, '2026-08-07 20:15:05.584114+00');
INSERT INTO public.chat_messages (id, session_id, sender_id, sender_role, message, is_read, created_at) VALUES (6, 5, 14, 'user', 'How exactly do this platform works', false, '2026-08-09 11:17:52.274276+00');
INSERT INTO public.chat_messages (id, session_id, sender_id, sender_role, message, is_read, created_at) VALUES (7, 6, 13, 'user', 'When will I be ready to trade', true, '2026-08-09 18:42:34.657231+00');
INSERT INTO public.chat_messages (id, session_id, sender_id, sender_role, message, is_read, created_at) VALUES (8, 6, 1, 'admin', 'Your trade has started!', false, '2026-08-10 12:34:47.441307+00');


--
-- Data for Name: chat_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.chat_sessions (id, user_id, status, last_message_at, created_at) VALUES (1, 3, 'closed', '2026-08-03 22:03:02.028+00', '2026-08-03 21:29:59.036171+00');
INSERT INTO public.chat_sessions (id, user_id, status, last_message_at, created_at) VALUES (2, 3, 'open', '2026-08-04 07:07:36.860602+00', '2026-08-04 07:07:36.860602+00');
INSERT INTO public.chat_sessions (id, user_id, status, last_message_at, created_at) VALUES (3, 6, 'open', '2026-08-04 10:11:01.763201+00', '2026-08-04 10:11:01.763201+00');
INSERT INTO public.chat_sessions (id, user_id, status, last_message_at, created_at) VALUES (4, 10, 'open', '2026-08-07 20:15:05.606+00', '2026-08-07 20:14:47.288219+00');
INSERT INTO public.chat_sessions (id, user_id, status, last_message_at, created_at) VALUES (5, 14, 'open', '2026-08-09 11:17:52.291+00', '2026-08-09 11:17:31.168063+00');
INSERT INTO public.chat_sessions (id, user_id, status, last_message_at, created_at) VALUES (6, 13, 'open', '2026-08-10 12:34:47.467+00', '2026-08-09 18:42:03.963915+00');


--
-- Data for Name: copy_trading_strategies; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: investments; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: kyc_documents; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.kyc_documents (id, user_id, document_type, front_url, back_url, selfie_url, status, admin_notes, submitted_at, reviewed_at) VALUES (1, 2, 'passport', '/objects/uploads/66b5de37-d9ad-4807-99c1-26f1a5ab1fa3', '/objects/uploads/45361891-9ec7-4a51-8e23-f6cca95944a1', '/objects/uploads/bddb23be-c2be-47c2-9af8-b368e1afe39e', 'approved', NULL, '2026-08-03 19:12:28.399713+00', '2026-08-03 19:47:51.395+00');
INSERT INTO public.kyc_documents (id, user_id, document_type, front_url, back_url, selfie_url, status, admin_notes, submitted_at, reviewed_at) VALUES (2, 3, 'passport', '/objects/uploads/6fa47176-2d7a-461f-884c-8ad2b90530e6', NULL, NULL, 'rejected', NULL, '2026-08-03 21:30:19.732607+00', '2026-08-03 21:31:08.843+00');
INSERT INTO public.kyc_documents (id, user_id, document_type, front_url, back_url, selfie_url, status, admin_notes, submitted_at, reviewed_at) VALUES (3, 3, 'passport', '/objects/uploads/0c923e21-5c0f-40dd-965e-4809e57eef55', '/objects/uploads/19d9db96-7b90-4d59-96c1-14be29d80674', '/objects/uploads/992cc9ae-9029-4455-8e97-e92e3451c0c1', 'rejected', NULL, '2026-08-04 03:17:56.342587+00', '2026-08-04 05:26:42.906+00');
INSERT INTO public.kyc_documents (id, user_id, document_type, front_url, back_url, selfie_url, status, admin_notes, submitted_at, reviewed_at) VALUES (5, 5, 'national_id', '/objects/uploads/9be7a26f-8cce-4a95-b008-c16505ce9bcd', NULL, '/objects/uploads/dc75ff3b-807e-47db-89e0-159fe8c23126', 'approved', NULL, '2026-08-04 08:03:45.444876+00', '2026-08-04 08:16:16.674+00');
INSERT INTO public.kyc_documents (id, user_id, document_type, front_url, back_url, selfie_url, status, admin_notes, submitted_at, reviewed_at) VALUES (4, 3, 'passport', '/objects/uploads/e755ffdc-daac-468d-905e-55138b959d31', NULL, NULL, 'approved', NULL, '2026-08-04 05:28:09.06147+00', '2026-08-04 08:16:23.569+00');


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.notifications (id, user_id, type, title, message, is_read, created_at) VALUES (1, 2, 'kyc_approved', 'KYC Verified ✓', 'Your identity has been verified. Your account is now fully activated.', false, '2026-08-03 19:47:51.441197+00');
INSERT INTO public.notifications (id, user_id, type, title, message, is_read, created_at) VALUES (2, 2, 'deposit_approved', 'Deposit Approved', 'Your deposit of $200 has been approved.', false, '2026-08-03 19:49:02.717595+00');
INSERT INTO public.notifications (id, user_id, type, title, message, is_read, created_at) VALUES (6, 1, 'admin_kyc_submitted', 'New KYC Submission', 'Doe (nkingsley130@gmail.com) submitted identity documents for review.', true, '2026-08-04 05:28:09.161111+00');
INSERT INTO public.notifications (id, user_id, type, title, message, is_read, created_at) VALUES (3, 3, 'kyc_rejected', 'KYC Rejected', 'Your KYC was rejected. Please resubmit.', true, '2026-08-03 21:31:08.886417+00');
INSERT INTO public.notifications (id, user_id, type, title, message, is_read, created_at) VALUES (5, 3, 'kyc', 'KYC Submitted', 'Your identity documents have been submitted for review. We''ll notify you within 24 hours.', true, '2026-08-04 05:28:09.089594+00');
INSERT INTO public.notifications (id, user_id, type, title, message, is_read, created_at) VALUES (4, 3, 'kyc_rejected', 'KYC Rejected', 'Your KYC was rejected. ', true, '2026-08-04 05:26:42.956769+00');
INSERT INTO public.notifications (id, user_id, type, title, message, is_read, created_at) VALUES (7, 5, 'kyc', 'KYC Submitted', 'Your identity documents have been submitted for review. We''ll notify you within 24 hours.', false, '2026-08-04 08:03:45.485893+00');
INSERT INTO public.notifications (id, user_id, type, title, message, is_read, created_at) VALUES (8, 1, 'admin_kyc_submitted', 'New KYC Submission', 'Perkins  (perkinsgary441@gmail.com) submitted identity documents for review.', true, '2026-08-04 08:03:45.584317+00');
INSERT INTO public.notifications (id, user_id, type, title, message, is_read, created_at) VALUES (9, 5, 'kyc_approved', 'KYC Verified ✓', 'Your identity has been verified. Your account is now fully activated.', false, '2026-08-04 08:16:16.722559+00');
INSERT INTO public.notifications (id, user_id, type, title, message, is_read, created_at) VALUES (10, 3, 'kyc_approved', 'KYC Verified ✓', 'Your identity has been verified. Your account is now fully activated.', false, '2026-08-04 08:16:23.61607+00');
INSERT INTO public.notifications (id, user_id, type, title, message, is_read, created_at) VALUES (11, 1, 'admin_chat_message', 'New Chat Message', 'Gomotsegang Moeti sent a message: "Is there an app for this"', false, '2026-08-07 20:15:05.730873+00');
INSERT INTO public.notifications (id, user_id, type, title, message, is_read, created_at) VALUES (12, 1, 'admin_chat_message', 'New Chat Message', 'Ngonidzashe Mandeya sent a message: "How exactly do this platform works"', false, '2026-08-09 11:17:52.384708+00');
INSERT INTO public.notifications (id, user_id, type, title, message, is_read, created_at) VALUES (13, 1, 'admin_chat_message', 'New Chat Message', 'Ntando  sent a message: "When will I be ready to trade"', true, '2026-08-09 18:42:34.789264+00');


--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.plans (id, name, description, min_amount, max_amount, roi_percent, duration_days, tier, is_active, features, created_at, updated_at) VALUES (1, 'Bronze Starter', 'Begin your crypto journey with our entry-level plan. Steady returns with minimal risk exposure.', 100, 999, 5, 30, 'bronze', true, '{"5% ROI in 30 days","Dedicated support","Daily profit updates","Instant withdrawals"}', '2026-08-02 23:37:53.073538+00', '2026-08-02 23:37:53.073538+00');
INSERT INTO public.plans (id, name, description, min_amount, max_amount, roi_percent, duration_days, tier, is_active, features, created_at, updated_at) VALUES (2, 'Silver Growth', 'Scale your portfolio with consistent returns. Ideal for investors ready to commit more capital.', 1000, 4999, 8.5, 30, 'silver', true, '{"8.5% ROI in 30 days","Priority support","Daily profit updates","Instant withdrawals","Weekly market reports"}', '2026-08-02 23:37:53.073538+00', '2026-08-02 23:37:53.073538+00');
INSERT INTO public.plans (id, name, description, min_amount, max_amount, roi_percent, duration_days, tier, is_active, features, created_at, updated_at) VALUES (3, 'Gold Elite', 'Our most popular plan. Premium returns for serious investors seeking meaningful portfolio growth.', 5000, 19999, 12, 30, 'gold', true, '{"12% ROI in 30 days","VIP support","Real-time profit tracking","Instant withdrawals","Weekly market reports","Portfolio analysis"}', '2026-08-02 23:37:53.073538+00', '2026-08-02 23:37:53.073538+00');
INSERT INTO public.plans (id, name, description, min_amount, max_amount, roi_percent, duration_days, tier, is_active, features, created_at, updated_at) VALUES (4, 'Platinum Prestige', 'Exclusive access to our highest-yield strategies. Designed for high-net-worth investors.', 20000, 99999, 18, 30, 'platinum', true, '{"18% ROI in 30 days","Personal account manager","Real-time profit tracking","Priority withdrawals","Daily market reports","Portfolio analysis","Referral bonus 2x"}', '2026-08-02 23:37:53.073538+00', '2026-08-02 23:37:53.073538+00');
INSERT INTO public.plans (id, name, description, min_amount, max_amount, roi_percent, duration_days, tier, is_active, features, created_at, updated_at) VALUES (5, 'Diamond Sovereign', 'The pinnacle of crypto investment. Ultra-premium returns for our most exclusive members.', 100000, NULL, 25, 30, 'diamond', true, '{"25% ROI in 30 days","Dedicated wealth advisor","Real-time profit tracking","Instant withdrawals","Private market intelligence","Full portfolio management","Referral bonus 3x","Exclusive investment opportunities"}', '2026-08-02 23:37:53.073538+00', '2026-08-02 23:37:53.073538+00');


--
-- Data for Name: referrals; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: trading_signals; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.transactions (id, user_id, type, amount, status, crypto_type, wallet_address, tx_hash, notes, proof_url, created_at, updated_at) VALUES (1, 2, 'deposit', 200, 'completed', 'BTC', NULL, NULL, NULL, NULL, '2026-08-03 15:50:32.969028+00', '2026-08-03 19:49:02.563+00');
INSERT INTO public.transactions (id, user_id, type, amount, status, crypto_type, wallet_address, tx_hash, notes, proof_url, created_at, updated_at) VALUES (2, 3, 'bonus', 100, 'completed', 'USD', NULL, NULL, 'Deposit', NULL, '2026-08-08 21:10:17.480734+00', '2026-08-08 21:10:17.480734+00');
INSERT INTO public.transactions (id, user_id, type, amount, status, crypto_type, wallet_address, tx_hash, notes, proof_url, created_at, updated_at) VALUES (3, 13, 'deposit', 85, 'completed', 'USD', NULL, NULL, 'Deposit ', NULL, '2026-08-09 07:51:40.051911+00', '2026-08-09 07:51:40.051911+00');
INSERT INTO public.transactions (id, user_id, type, amount, status, crypto_type, wallet_address, tx_hash, notes, proof_url, created_at, updated_at) VALUES (4, 13, 'profit', 50, 'completed', 'USD', NULL, NULL, 'Admin credit', NULL, '2026-08-10 12:35:24.231055+00', '2026-08-10 12:35:24.231055+00');


--
-- Data for Name: user_copy_trading; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users (id, email, password_hash, full_name, phone, country, role, status, balance, total_invested, total_profit, referral_code, referred_by, avatar_url, created_at, updated_at) VALUES (1, 'admin@novacrest.com', 'e0e617ad707b90600c8fa1499a4d0090:32c59fb1133a9c6360cb98bee54e6fe237833001c8a53451111515553946e64c349a41f67d5b51e223c7e6c233a35836c9731ac2db474875fcf4520a9061e776', 'Novacrest Admin', NULL, NULL, 'admin', 'active', 0, 0, 0, 'ADMIN001', NULL, NULL, '2026-08-03 00:27:37.756331+00', '2026-08-03 00:27:37.756331+00');
INSERT INTO public.users (id, email, password_hash, full_name, phone, country, role, status, balance, total_invested, total_profit, referral_code, referred_by, avatar_url, created_at, updated_at) VALUES (4, 'mrsamuelbillionaires@gmail.com', '900e972e25ce92e371aa61d34a0be354:a179bbbfed963f79bcabf7ba4b9e7aad93e2b6bacb0137f80ca7edf127b83cdad2a0b3629f4dcf77d94d0ffe0de726e3456aa0f2d77b8c3f5afe66619c80aecc', 'MRRSAMUEL ', '9024913955', 'Nigeria ', 'user', 'active', 0, 0, 0, '96AACA11', NULL, NULL, '2026-08-03 13:44:17.240212+00', '2026-08-03 13:44:17.240212+00');
INSERT INTO public.users (id, email, password_hash, full_name, phone, country, role, status, balance, total_invested, total_profit, referral_code, referred_by, avatar_url, created_at, updated_at) VALUES (2, 'demo@novacrest.com', '64c22e4d5d6c0c90da4bd82bc1ca65aa:041b5350e1ebc9cddf42a25f8cf1cc96564f590670a4cd3002e514e95d6f61ffac2d672dd87c6a87a487b689559514082d22fd2cc79ec4a5e0a0c435267bdcfb', 'Alex Sovereign', NULL, NULL, 'user', 'active', 15200, 5000, 1250, 'DEMO001', NULL, NULL, '2026-08-03 00:27:37.917107+00', '2026-08-03 19:49:02.62+00');
INSERT INTO public.users (id, email, password_hash, full_name, phone, country, role, status, balance, total_invested, total_profit, referral_code, referred_by, avatar_url, created_at, updated_at) VALUES (5, 'perkinsgary441@gmail.com', '39e317ec6d5a085084ec626acefd7440:f91976200df63e97f1080c30d3d820efaf2fb3c0b74775e4bac9e2ff3eacb9864327324d027ed08ebbde9a4a87a1d5a43c82d963614f590a30a2f20d5075893a', 'Perkins ', '09025835422', 'Nigeria', 'user', 'active', 0, 0, 0, '16928005', NULL, NULL, '2026-08-04 07:49:05.793565+00', '2026-08-04 07:49:05.793565+00');
INSERT INTO public.users (id, email, password_hash, full_name, phone, country, role, status, balance, total_invested, total_profit, referral_code, referred_by, avatar_url, created_at, updated_at) VALUES (6, 'emmacough4@gmail.com', 'ed1f0fe69a93903fb9e36527d6b01056:24fe90058dabfa6774c41563ef71741e8c3cfd5cd5547de4032250be64d6aa45b21f755f8a8100b683769ce05301f61c9f0450bd334902db69ffe1c9cb6d22f3', 'Emma Cough', NULL, NULL, 'user', 'active', 0, 0, 0, '1D81CDEB', NULL, NULL, '2026-08-04 09:28:58.327971+00', '2026-08-04 09:28:58.327971+00');
INSERT INTO public.users (id, email, password_hash, full_name, phone, country, role, status, balance, total_invested, total_profit, referral_code, referred_by, avatar_url, created_at, updated_at) VALUES (7, 'Wmckenzie083@gmail.com', 'acb493f8d9a1d1b11e8f91a41b50a441:927b81625f6035e0e856a504159e27451466e23fb533259de761c35bb532285dd56550812a08301e4e45599edfbf1fa1981077a4e76bb9e2f2f18f8a2e1bf491', 'Wilson valentine McKenzie ', '612-3706 ', 'Belize', 'user', 'active', 0, 0, 0, '964410EE', NULL, NULL, '2026-08-05 00:19:50.013267+00', '2026-08-05 00:19:50.013267+00');
INSERT INTO public.users (id, email, password_hash, full_name, phone, country, role, status, balance, total_invested, total_profit, referral_code, referred_by, avatar_url, created_at, updated_at) VALUES (8, 'jasminsewell13@gmail.com', 'b0ac114c8bc39594ba53a9ee11afd70b:a11cc5df26461b8704ce954d30d664755531c8f701b014a844f608c7f9a18fd9603743b0c459a245bf99a1c16b33d3c0725021ef3e33e7259b580fa4d33e7e55', 'Jasmin Sewell', NULL, 'Belize city', 'user', 'active', 0, 0, 0, 'AB2C2A02', NULL, NULL, '2026-08-05 00:41:00.44433+00', '2026-08-05 00:41:00.44433+00');
INSERT INTO public.users (id, email, password_hash, full_name, phone, country, role, status, balance, total_invested, total_profit, referral_code, referred_by, avatar_url, created_at, updated_at) VALUES (9, 'andrypierre28@gmail.com', '8da019dd80ef0a2a97c3c067db8ef093:3ce4d94af212f45ec70b5552c237e6ef8e140a4d033f7ec94878bded5994e28e95793d7e996b666298e658ff99934cbc97c382a6509ee8c9ec0cf5c739f1c85f', 'Andry pierre ', '12428292362', 'Bahamas ', 'user', 'active', 0, 0, 0, '22795AFC', NULL, NULL, '2026-08-05 01:17:42.366107+00', '2026-08-05 01:17:42.366107+00');
INSERT INTO public.users (id, email, password_hash, full_name, phone, country, role, status, balance, total_invested, total_profit, referral_code, referred_by, avatar_url, created_at, updated_at) VALUES (10, 'gomotsegangtsomele@gmail.com', '43c537642b8a5b873ea93861af4302e0:cce92ac8f082cacdfff6bd85fc85edb6387720d549a147754f4247acd3a9c19b3d5789f962f86f9d86e79d4a5147701a1c8cf2081c8250ffe8eae1eb4844db24', 'Gomotsegang Moeti', '+27637881693', 'South Africa ', 'user', 'active', 0, 0, 0, '895176F9', NULL, NULL, '2026-08-06 20:19:36.308737+00', '2026-08-06 20:19:36.308737+00');
INSERT INTO public.users (id, email, password_hash, full_name, phone, country, role, status, balance, total_invested, total_profit, referral_code, referred_by, avatar_url, created_at, updated_at) VALUES (11, 'Emmacough4@gmail.com', '7167697c90ee8fb6d13b378b2a490fd2:92647135b7a76c16d22a9a2cc5904a6917f17ff870597561107fcaf9337208db40e6257f25322aa5b6aa8a465494690ccab7f4723ad23e52c8092fc6ff5ec491', 'Emma', NULL, NULL, 'user', 'active', 0, 0, 0, '9DDE858E', NULL, NULL, '2026-08-08 14:20:53.550549+00', '2026-08-08 14:20:53.550549+00');
INSERT INTO public.users (id, email, password_hash, full_name, phone, country, role, status, balance, total_invested, total_profit, referral_code, referred_by, avatar_url, created_at, updated_at) VALUES (12, 'Pilisiadonis@gmail.com', '7aa8218da2ed12d1348c955acf272dfa:80313a66e1b5e8c032cdfb4bc3c82ef370fdf623728cb6baa37c4ddc3787c86b1e795611ac4d982d66dae4f76556a9678a1f1e5a88eb58cc27c799fc1e24abe0', 'Ntando ', '+27718435684', '+27', 'user', 'active', 0, 0, 0, 'FCD0B07C', NULL, NULL, '2026-08-08 14:36:15.851011+00', '2026-08-08 14:36:15.851011+00');
INSERT INTO public.users (id, email, password_hash, full_name, phone, country, role, status, balance, total_invested, total_profit, referral_code, referred_by, avatar_url, created_at, updated_at) VALUES (3, 'nkingsley130@gmail.com', '2b3e0c82ea64541e513c98467f84d1a7:29f47b1cdeebb346dbe59c1dfd9d668f09139739c1e2762954a4206d7a21f5f38f3da82e58545167b6c15ae6354a54d69b60c0e571c8b709d765247a43ca30da', 'Doe', NULL, NULL, 'user', 'active', 100, 0, 0, '9E008786', NULL, NULL, '2026-08-03 00:35:36.505769+00', '2026-08-08 21:10:17.437+00');
INSERT INTO public.users (id, email, password_hash, full_name, phone, country, role, status, balance, total_invested, total_profit, referral_code, referred_by, avatar_url, created_at, updated_at) VALUES (14, 'mandeyangonidzashe4@gmail.com', '469a41064f84d71481852261322d515c:ccec95359c1254d782c20c92573dcba245350a7aa2fe2300d669a12cfd0a723bd10c1a62ce463d54174d45c89292ee2d897de3529c168988807fc05e78181227', 'Ngonidzashe Mandeya', '+263714961294', 'Zimbabwe', 'user', 'active', 0, 0, 0, '3BF8BB24', NULL, NULL, '2026-08-09 11:17:03.557027+00', '2026-08-09 11:17:03.557027+00');
INSERT INTO public.users (id, email, password_hash, full_name, phone, country, role, status, balance, total_invested, total_profit, referral_code, referred_by, avatar_url, created_at, updated_at) VALUES (15, 'eloiserogers200@gmail.com', 'cbcdc63912643294120bcc4014ee65f6:d636d200c1bdb69a4e15952f637d11a6c8a63f16497d1a98fbbd7454a2d9977412db2a263b25018a34dbd1a80e3a513185b5a0372c7c1a3b35b884a4750ec677', 'Eloise Rogers', '+1268778716-', 'Antigua & Barbuda', 'user', 'active', 0, 0, 0, '671F6C50', NULL, NULL, '2026-08-09 20:47:35.867828+00', '2026-08-09 20:47:35.867828+00');
INSERT INTO public.users (id, email, password_hash, full_name, phone, country, role, status, balance, total_invested, total_profit, referral_code, referred_by, avatar_url, created_at, updated_at) VALUES (13, 'pilisiadonis@gmail.com', '23ae03040eb101c8aff785afa984530c:cd441651f9f45fcd7df5f959204125114cb6a4c2ac6f65d28d7b46b83458c3286ea64c8c8901d61663651e10d66e37000c0b4b7e89351f57ccd782e9fd435129', 'Ntando ', '+27718435684', 'South Africa', 'user', 'active', 135, 0, 50, '02461DF7', NULL, NULL, '2026-08-08 15:21:56.523064+00', '2026-08-10 12:35:24.189+00');


--
-- Data for Name: wallet_addresses; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.wallet_addresses (id, crypto_type, network, label, address, is_active, created_at, updated_at) VALUES (1, 'BTC', 'Mainnet', 'Bitcoin', 'bc1qlykdrjcgvw86fez7tlr90844geht5nvve9srxh', true, '2026-08-05 00:47:29.993433+00', '2026-08-05 00:47:29.993433+00');
INSERT INTO public.wallet_addresses (id, crypto_type, network, label, address, is_active, created_at, updated_at) VALUES (3, 'USDT', 'TRC20', 'Tether (TRC20)', 'TC2oLvucKAK9fjcTVmbtvuP1qy8JYWWEqw', true, '2026-08-05 00:50:11.582313+00', '2026-08-05 00:50:11.582313+00');
INSERT INTO public.wallet_addresses (id, crypto_type, network, label, address, is_active, created_at, updated_at) VALUES (4, 'BNB', 'BEP20', 'BNB Smart Chain', '0xb073032ea9fbbdd5c05fd1d9745a60bfe2c2fb65', true, '2026-08-05 00:50:53.819647+00', '2026-08-05 00:50:53.819647+00');
INSERT INTO public.wallet_addresses (id, crypto_type, network, label, address, is_active, created_at, updated_at) VALUES (5, 'SOL', 'Mainnet', 'Solana', 'NHYhqhwt6EKfH71JB6QxocjubthLxDVfR2n6Ah9eH1z', true, '2026-08-05 00:51:29.356064+00', '2026-08-05 00:51:29.356064+00');
INSERT INTO public.wallet_addresses (id, crypto_type, network, label, address, is_active, created_at, updated_at) VALUES (6, 'XRP', 'Mainnet', 'XRP', 'rGKTQwNGabYJ76bctCppf9E1d2br6KqH5r', true, '2026-08-05 00:52:55.878161+00', '2026-08-05 00:52:55.878161+00');


--
-- Name: chat_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.chat_messages_id_seq', 8, true);


--
-- Name: chat_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.chat_sessions_id_seq', 6, true);


--
-- Name: copy_trading_strategies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.copy_trading_strategies_id_seq', 1, true);


--
-- Name: investments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.investments_id_seq', 1, true);


--
-- Name: kyc_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.kyc_documents_id_seq', 5, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 13, true);


--
-- Name: plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.plans_id_seq', 5, true);


--
-- Name: referrals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.referrals_id_seq', 1, true);


--
-- Name: trading_signals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.trading_signals_id_seq', 1, true);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.transactions_id_seq', 4, true);


--
-- Name: user_copy_trading_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_copy_trading_id_seq', 1, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 15, true);


--
-- Name: wallet_addresses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.wallet_addresses_id_seq', 6, true);


--
-- PostgreSQL database dump complete
--


