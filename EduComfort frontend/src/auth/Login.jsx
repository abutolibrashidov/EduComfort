import React, { useState, useEffect } from "react";
import { Form, Input, Typography } from "antd";
import { UserOutlined, LockOutlined, EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { message } from "antd";
import { loginUser, decodeToken } from "../api/auth";
import EduLogo from "../components/EduLogo";
import "./Login.css";

const { Text } = Typography;


const Login = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentLang, setCurrentLang] = useState(i18n.language || 'uz');

  useEffect(() => { setMounted(true); }, []);

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const response = await loginUser(values.login, values.password);
      if (!response?.access_token) throw new Error("Invalid server response");
      const payload = decodeToken(response.access_token);
      if (!payload) throw new Error("Failed to decode token");
      const role = payload?.role;
      if (!role) throw new Error("No role in token");
      message.success(t('welcome_back', { name: payload.first_name || 'User' }));
      await new Promise(r => setTimeout(r, 100));
      const routes = {
        admin: "/admin", super_admin: "/admin", platform_owner: "/platform",
        teacher: "/teacher", student: "/student", staff: "/staff", guest: "/public"
      };
      navigate(routes[role] || "/", { replace: true });
    } catch (err) {
      let msg = t('login_failed') || "Kirish amalga oshmadi";
      if (err?.response?.data?.detail) {
        const d = err.response.data.detail;
        if (Array.isArray(d) && d.length > 0) msg = d[0].msg || msg;
        else if (typeof d === "string") msg = d;
      }
      message.error(msg);
      localStorage.removeItem("sp_token");
      localStorage.removeItem("sp_user");
    } finally { setLoading(false); }
  };

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
    setCurrentLang(lang);
  };

  const languages = [
    { code: 'uz', label: "O'zbek", flag: "🇺🇿" },
    { code: 'ru', label: "Рус", flag: "🇷🇺" },
    { code: 'en', label: "EN", flag: "🇬🇧" },
  ];

  const brandPoints = [
    t('login_feat1') || "Real-vaqtda davomat nazorati",
    t('login_feat2') || "LMS va CRM – bir platformada",
    t('login_feat3') || "Gamifikatsiya va marketplace",
  ];

  return (
    <div className={`login-root ${mounted ? 'login-mounted' : ''}`}>

      {/* ── Left Brand Panel ── */}
      <div className="login-brand">
        <div className="login-brand-shape s1" />
        <div className="login-brand-shape s2" />
        <div className="login-brand-shape s3" />

        <div className="login-brand-body">
          <EduLogo size={44} dark animate />

          <div className="login-brand-text">
            <h1 className="login-brand-h1">
              {t('login_brand_headline') || "Ta'limni yangi darajaga olib chiqing"}
            </h1>
            <p className="login-brand-p">
              {t('login_brand_sub') || "Markazlar, o'qituvchilar va o'quvchilar uchun to'liq LMS + CRM platformasi"}
            </p>
          </div>

          <ul className="login-brand-feats">
            {brandPoints.map((p, i) => (
              <li key={i} className="login-brand-feat">
                <span className="login-feat-check">✓</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>

          <div className="login-brand-roles">
            {[
              { e: "🏫", l: t('lp_role_institution') || "Markaz" },
              { e: "👨‍🏫", l: t('lp_role_teacher') || "O'qituvchi" },
              { e: "👩‍🎓", l: t('lp_role_student') || "O'quvchi" },
              { e: "⚙️", l: t('lp_role_admin') || "Admin" },
            ].map((r, i) => (
              <div key={i} className="login-role-chip">{r.e} {r.l}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="login-form-side">
        {/* Language bar */}
        <div className="login-top-bar">
          <button className="login-back-link" onClick={() => navigate('/')}>
            ← {t('home') || "Bosh sahifa"}
          </button>
          <div className="login-langs">
            {languages.map(l => (
              <button key={l.code} className={`login-lang ${currentLang === l.code ? 'active' : ''}`} onClick={() => changeLanguage(l.code)}>
                {l.flag} {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="login-form-wrap">
          {/* Mobile logo */}
          <div className="login-mobile-logo"><EduLogo size={34} animate /></div>

          <div className="login-form-head">
            <h2 className="login-form-h2">{t('welcome_to_educomfort') || "Xush Kelibsiz"}</h2>
            <p className="login-form-sub">{t('sign_in_to_continue') || "Davom etish uchun tizimga kiring"}</p>
          </div>

          <Form layout="vertical" onFinish={handleLogin} autoComplete="off" size="large" className="login-form" autoSave="off">
            <Form.Item
              label={<span className="login-label">{t('email_or_phone') || "Email yoki telefon"}</span>}
              name="login"
              rules={[
                { required: true, message: t('please_enter_email_or_phone') || "Email yoki telefon kiriting" },
                { min: 3, message: t('min_3_characters') || "Kamida 3 ta belgi" }
              ]}
            >
              <Input prefix={<UserOutlined className="login-iicon" />}
                placeholder={t('enter_email_or_phone') || "Email yoki telefon"}
                disabled={loading} className="login-input"
                autoComplete="off" />
            </Form.Item>

            <Form.Item
              label={<span className="login-label">{t('password') || "Parol"}</span>}
              name="password"
              rules={[
                { required: true, message: t('please_enter_password') || "Parolni kiriting" },
                { min: 6, message: t('password_min_6') || "Kamida 6 ta belgi" }
              ]}
              style={{ marginBottom: 12 }}
            >
              <Input.Password prefix={<LockOutlined className="login-iicon" />}
                placeholder={t('enter_password') || "Parol"}
                disabled={loading} className="login-input"
                autoComplete="new-password"
                iconRender={v => v ? <EyeOutlined /> : <EyeInvisibleOutlined />} />
            </Form.Item>

            <div style={{ textAlign: 'right', marginBottom: 16 }}>
              <button
                type="button"
                className="login-reg-link"
                style={{ fontSize: 13 }}
                onClick={() => navigate('/forgot-password')}
              >
                {t('forgot_password', 'Parolni unutdingizmi?')}
              </button>
            </div>

            <Form.Item style={{ marginTop: 4 }}>
              <button type="submit" className={`login-submit ${loading ? 'loading' : ''}`} disabled={loading}>
                {loading
                  ? <span className="login-spin-wrap"><span className="login-spinner" /> {t('signing_in') || "Kirish..."}</span>
                  : <><span>{t('sign_in') || "Kirish"}</span><span className="login-btn-arr">→</span></>
                }
              </button>
            </Form.Item>
          </Form>

          <div className="login-register-row">
            <Text className="login-reg-text">{t('dont_have_account') || "Hisobingiz yo'qmi?"}</Text>
            <button className="login-reg-link" onClick={() => navigate('/register')}>
              {t('register_now') || "Ro'yxatdan o'ting"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
