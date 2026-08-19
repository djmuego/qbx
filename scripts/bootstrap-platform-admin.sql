-- Bootstrap first platform admin (run once after your account exists)
-- Replace email with your login.

select public.bootstrap_platform_admin_by_email('alexmuego@gmail.com');

-- Verify
select public.is_platform_admin();
