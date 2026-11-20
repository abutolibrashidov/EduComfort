import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { message } from "antd";
import { Info, Lock, Mail } from "lucide-react";
import { loginUser, decodeToken } from "../api/auth";
import Button from "../components/public/Button";
import { Checkbox, PasswordField, TextField } from "../components/public/Input";
import { GoogleIcon, TelegramIcon } from "../components/public/BrandIcons";

const REMEMBER_KEY = "remember_login";

const TelegramBrand = () => <span className="auth-telegram"><TelegramIcon size={18} /></span>;

// Turns an axios error into a message the user can act on, in the current language.
const loginErrorMessage = (err, t) => {
  const status = err?.response?.status;
  if (!err?.response) return t("pub.login.errNetwork");
  if (status === 401) return t("pub.login.errInvalid");
  if (status === 403) return t("pub.login.errInactive");
  if (status === 429) return t("pub.login.errTooMany");
  return t("pub.login.errServer");
};

const readRemembered = () => {
  try { return localStorage.getItem(REMEMBER_KEY) || ""; } catch { return ""; }
};

const Login = () => {
  const { t } = useTranslation();
  const [values, setValues] = useState(() => ({ login: readRemembered(), password: "" }));
  const [remember, setRemember] = useState(() => !!readRemembered());
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [shake, setShake] = useState(0);
  const [loading, setLoading] = useState(false);

  const validate = (v) => {
    const e = {};
    if (!v.login.trim()) e.login = t("pub.common.required");
    else if (v.login.trim().length < 3) e.login = t("pub.common.minChars", { n: 3 });
    if (!v.password) e.password = t("pub.common.required");
    else if (v.password.length < 6) e.password = t("pub.common.minChars", { n: 6 });
    return e;
  };

  const set = (key) => (e) => {
    const next = { ...values, [key]: e.target.value };
    setValues(next);
    if (touched[key]) setErrors(validate(next));
  };
  const blur = (key) => () => {
    setTouched((s) => ({ ...s, [key]: true }));
    if (values[key]) setErrors(validate(values));
  };

  const handleLogin = async ({ login, password }) => {
    setLoading(true);
    try {
      const response = await loginUser(login, password);
      if (!response?.access_token) throw new Error("Invalid server response");
      const payload = decodeToken(response.access_token);
      if (!payload) throw new Error("Failed to decode token");
      const role = payload?.role;
      if (!role) throw new Error("No role in token");
      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, login);
        else localStorage.removeItem(REMEMBER_KEY);
      } catch { /* ignore */ }
      message.success(t('welcome_back', { name: payload.first_name || 'User' }));
      await new Promise(r => setTimeout(r, 100));
      const routes = {
        admin: "/admin", super_admin: "/admin", platform_owner: "/platform",
        teacher: "/teacher", student: "/student", staff: "/staff", guest: "/public",
        parent: "/parent"
      };
      // Hard redirect ensures global BrandingContext mounts and injects theme CSS correctly
      window.location.href = routes[role] || "/";
    } catch (err) {
      message.error(loginErrorMessage(err, t));
      localStorage.removeItem("sp_token");
      localStorage.removeItem("sp_user");
      setShake((n) => n + 1);
    } finally { setLoading(false); }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    setTouched({ login: true, password: true });
    if (Object.keys(found).length) { setShake((n) => n + 1); return; }
    handleLogin({ login: values.login.trim(), password: values.password });
  };

  const soon = () => message.info(t("pub.common.soonToast"));
  const loginOk = touched.login && !errors.login && values.login.trim().length >= 3;

  return (
    <>
      <div className="auth-head">
        <h1>{t("pub.login.title")} <span className="auth-head__wave" aria-hidden="true">👋</span></h1>
        <p>{t("pub.login.sub")}</p>
      </div>

      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <TextField
          name="login"
          label={t("pub.login.loginLabel")}
          icon={Mail}
          value={values.login}
          onChange={set("login")}
          onBlur={blur("login")}
          error={touched.login && errors.login}
          valid={loginOk}
          shake={shake}
          hint={t("pub.login.loginHint")}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          disabled={loading}
        />
        <PasswordField
          name="password"
          label={t("pub.login.passwordLabel")}
          icon={Lock}
          value={values.password}
          onChange={set("password")}
          onBlur={blur("password")}
          error={touched.password && errors.password}
          shake={shake}
          autoComplete="current-password"
          disabled={loading}
        />

        <div className="auth-row">
          <Checkbox checked={remember} onChange={setRemember}>{t("pub.login.remember")}</Checkbox>
          <Link to="/forgot-password" className="ui-link">{t("pub.login.forgot")}</Link>
        </div>

        <Button type="submit" variant="primary" size="lg" block arrow loading={loading} loadingText={t("pub.login.submitting")}>
          {t("pub.login.submit")}
        </Button>
      </form>

      <div className="auth-divider" role="separator">{t("pub.common.or")}</div>

      <div className="auth-social">
        <Button variant="secondary" icon={GoogleIcon} onClick={soon} aria-label={t("pub.login.google")}>Google</Button>
        <Button variant="secondary" icon={TelegramBrand} onClick={soon} aria-label={t("pub.login.telegram")}>Telegram</Button>
      </div>

      <div className="auth-note" role="note">
        <Info size={18} strokeWidth={1.75} aria-hidden="true" />
        <p>{t("pub.login.memberNote")}</p>
      </div>

      <p className="auth-foot">
        {t("pub.login.noAccount")}
        <Link to="/register-center?type=CENTER" className="ui-link">{t("pub.login.register")}</Link>
      </p>
    </>
  );
};

export default Login;
