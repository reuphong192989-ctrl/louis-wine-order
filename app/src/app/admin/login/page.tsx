import LoginForm from "@/components/auth/LoginForm";

export default function AdminLoginPage() {
  return <LoginForm title="Đăng nhập quản trị" redirectTo="/admin/categories" />;
}
