import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { trackPageView } from './analytics';
import { BrandingProvider } from "./contexts/BrandingContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { Spin } from 'antd';

// Auth
import RequireAuth from "./auth/RequireAuth";
import Login from "./auth/Login";
import ForgotPassword from "./auth/ForgotPassword";
import ResetPassword from "./auth/ResetPassword";
import Unauthorized from "./pages/Unauthorized";

// Layouts - Keep layouts static for better perceived performance, or lazy if large
import AdminLayout from "./layouts/AdminLayout";
import StudentLayout from "./layouts/StudentLayout";
import TeacherLayout from "./layouts/TeacherLayout";
import StaffLayout from "./layouts/StaffLayout";
import PublicLayout from "./layouts/PublicLayout";
import AuthLayout from "./layouts/AuthLayout";
import PlatformOwnerLayout from './layouts/PlatformOwnerLayout';

// Components
import ProtectedHome from "./components/ProtectedHome";

// PUBLIC PAGES
const LandingPage = React.lazy(() => import("./pages/public/LandingPage"));
const LearnerRegistration = React.lazy(() => import("./pages/public/LearnerRegistration"));
const CenterRegistration = React.lazy(() => import('./pages/public/CenterRegistration'));
const ProfileSetup = React.lazy(() => import("./pages/public/ProfileSetup"));
const InstitutionProfile = React.lazy(() => import('./pages/public/InstitutionProfile'));
const PublicProfile = React.lazy(() => import('./pages/public/PublicProfile'));
const PrivacyPolicyLazy = React.lazy(() => import("./pages/public/PrivacyPolicy"));
const TermsOfServiceLazy = React.lazy(() => import("./pages/public/TermsOfService"));

// PLATFORM OWNER PAGES
const PlatformDashboard = React.lazy(() => import('./pages/platform/PlatformDashboard'));
const AllInstitutions = React.lazy(() => import('./pages/platform/AllInstitutions'));
const AllLearners = React.lazy(() => import('./pages/platform/AllLearners'));
const SystemHealth = React.lazy(() => import('./pages/platform/SystemHealth'));
const PlatformAnalytics = React.lazy(() => import('./pages/platform/PlatformAnalytics'));
const PlatformSettings = React.lazy(() => import('./pages/platform/PlatformSettings'));
const PlatformProfile = React.lazy(() => import('./pages/platform/PlatformProfile'));
const BillingManagement = React.lazy(() => import('./pages/platform/BillingManagement'));
const PlatformSubscriptions = React.lazy(() => import('./pages/platform/PlatformSubscriptions'));
const PlatformMessaging = React.lazy(() => import('./pages/platform/PlatformMessaging'));

// ADMIN PAGES
const Dashboard = React.lazy(() => import("./pages/admin/Dashboard"));
const Users = React.lazy(() => import("./pages/admin/Users"));
const Groups = React.lazy(() => import("./pages/admin/Groups"));
const Sinflar = React.lazy(() => import("./pages/admin/Sinflar"));
const SinfPayments = React.lazy(() => import("./pages/admin/SinfPayments"));
const Branches = React.lazy(() => import("./pages/admin/Branches"));
const Payments = React.lazy(() => import("./pages/admin/Payments"));
const Messaging = React.lazy(() => import("./pages/admin/Messaging"));
const AdminProfile = React.lazy(() => import("./pages/admin/AdminProfile"));
const InstitutionSettings = React.lazy(() => import("./pages/admin/InstitutionSettings"));
const BillingSettings = React.lazy(() => import("./pages/admin/BillingSettings"));
const Subjects = React.lazy(() => import("./pages/admin/Subjects"));
const Marketplace = React.lazy(() => import("./pages/Marketplace"));
const AdminAnnouncements = React.lazy(() => import("./pages/admin/AdminAnnouncements"));
const AdminTeacherPayments = React.lazy(() => import("./pages/admin/AdminTeacherPayments"));
const FinanceManagement = React.lazy(() => import("./pages/admin/FinanceManagement"));
const RegistrarDashboard = React.lazy(() => import("./pages/admin/RegistrarDashboard"));
const FamilyDashboard = React.lazy(() => import("./pages/admin/FamilyDashboard"));
const AcademicYears = React.lazy(() => import("./pages/admin/AcademicYears"));
const GradeLevels = React.lazy(() => import("./pages/admin/GradeLevels"));
const SchoolStaff = React.lazy(() => import("./pages/admin/SchoolStaff"));

// STUDENT PAGES
const StudentDashboard = React.lazy(() => import("./pages/students/StudentDashboard"));
const CourseCatalog = React.lazy(() => import("./pages/students/CourseCatalog"));
const StudentCourses = React.lazy(() => import("./pages/students/StudentCourses"));
const StudentPayments = React.lazy(() => import("./pages/students/StudentPayments"));
const StudentChat = React.lazy(() => import("./pages/students/StudentChat"));
const StudentRating = React.lazy(() => import("./pages/students/StudentRating"));
const StudentProfile = React.lazy(() => import("./pages/students/StudentProfile"));
const StudentWorkbooks = React.lazy(() => import("./pages/students/StudentWorkbooks"));
const Achievements = React.lazy(() => import("./pages/students/Achievements"));
const WorkbookRunner = React.lazy(() => import("./pages/students/WorkbookRunner"));
const GamesHub = React.lazy(() => import('./pages/students/games/GamesHub'));
const WordMatchGame = React.lazy(() => import('./pages/students/games/WordMatch/WordMatchGame'));
const NewsFeed = React.lazy(() => import('./pages/students/NewsFeed'));
const StudentInstitutions = React.lazy(() => import('./pages/students/StudentInstitutions'));
const StudentTeachers = React.lazy(() => import('./pages/students/StudentTeachers'));
const ExamDashboard = React.lazy(() => import('./pages/students/ExamDashboard'));
const ExamRunner = React.lazy(() => import('./pages/students/ExamRunner'));
const BookReader = React.lazy(() => import('./components/books/BookReader'));

// TEACHER PAGES
const TeacherDashboard = React.lazy(() => import("./pages/teachers/TeacherDashboard"));
const TeacherGroups = React.lazy(() => import("./pages/teachers/TeacherGroups"));
const TeacherPlanner = React.lazy(() => import("./pages/teachers/TeacherPlanner"));
const TeacherMaterials = React.lazy(() => import("./pages/teachers/TeacherMaterials"));
const TeacherAttendance = React.lazy(() => import("./pages/teachers/TeacherAttendance"));
const TeacherBooks = React.lazy(() => import("./components/books/TeacherBooks"));
const TeacherCourses = React.lazy(() => import("./pages/teachers/TeacherCourses"));
const TeacherChat = React.lazy(() => import("./pages/teachers/TeacherChat"));
const TeacherAnnouncements = React.lazy(() => import("./pages/teachers/TeacherAnnouncements"));
const TeacherRating = React.lazy(() => import("./pages/teachers/TeacherRating"));
const TeacherProfile = React.lazy(() => import("./pages/teachers/TeacherProfile"));
const TeacherPayments = React.lazy(() => import("./pages/teachers/TeacherPayments"));
const TeacherWorkbooks = React.lazy(() => import("./pages/teachers/TeacherWorkbooks"));
const TeacherWorkbookDetail = React.lazy(() => import("./pages/teachers/TeacherWorkbookDetail"));
const TeacherExams = React.lazy(() => import("./pages/teachers/TeacherExams"));
const TeacherExamCreator = React.lazy(() => import("./pages/teachers/TeacherExamCreator"));
const TeacherExamDetails = React.lazy(() => import("./pages/teachers/TeacherExamDetails"));
const TeacherExamResults = React.lazy(() => import("./pages/teachers/TeacherExamResults"));
const TeacherGradebookExam = React.lazy(() => import("./pages/teachers/TeacherGradebookExam"));
const TeacherReviewPage = React.lazy(() => import("./pages/teacher/TeacherReviewPage"));
const TeacherLeaderboards = React.lazy(() => import("./pages/teachers/TeacherLeaderboards"));



// STAFF PAGES
const StaffDashboard = React.lazy(() => import("./pages/staff/StaffDashboard"));
const StaffBranches = React.lazy(() => import("./pages/staff/StaffBranches"));
const StaffUsers = React.lazy(() => import("./pages/staff/StaffUsers"));
const StaffMessaging = React.lazy(() => import("./pages/staff/StaffMessaging"));
const StaffProfile = React.lazy(() => import("./pages/staff/StaffProfile"));
const StaffPayments = React.lazy(() => import("./pages/staff/StaffPayments"));

// SHARED / PLACEHOLDERS
const ComingSoon = React.lazy(() => import("./pages/ComingSoon"));


import CookieConsent from "./components/common/CookieConsent";

// Fires a GA4 page_view event on every route change
function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
  return null;
}

function App() {
  return (
    <LanguageProvider>
      <BrandingProvider>
        <CookieConsent />
        <RouteTracker />
        <Routes>
          {/* STANDALONE PUBLIC ROUTES - own layout/navbar */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* AUTH ROUTES - shared AuthLayout (brand panel + animated page transitions) */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/register" element={<LearnerRegistration />} />
            <Route path="/register-center" element={<CenterRegistration />} />
          </Route>

          {/* OTHER PUBLIC ROUTES - Wrapped in PublicLayout */}
          <Route element={<PublicLayout />}>
            <Route path="/home" element={<ProtectedHome />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyLazy />} />
            <Route path="/terms-of-service" element={<TermsOfServiceLazy />} />
            <Route path="/profile-setup" element={<ProfileSetup />} />
            <Route path="/institutions/:id" element={<InstitutionProfile />} />
            <Route path="/profile/:id" element={<PublicProfile />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
          </Route>

          {/* PLATFORM OWNER ROUTES - Only YOU can access */}
          <Route element={<RequireAuth allowedRoles={["platform_owner"]} />}>
            <Route path="/platform" element={<PlatformOwnerLayout />}>
              <Route index element={<PlatformDashboard />} />
              <Route path="institutions" element={<AllInstitutions />} />
              <Route path="learners" element={<AllLearners />} />
              <Route path="health" element={<SystemHealth />} />
              <Route path="analytics" element={<PlatformAnalytics />} />
              <Route path="settings" element={<PlatformSettings />} />
              <Route path="profile" element={<PlatformProfile />} />
              <Route path="billing" element={<BillingManagement />} />
              <Route path="subscriptions" element={<PlatformSubscriptions />} />
              <Route path="messaging" element={<PlatformMessaging />} />
            </Route>
          </Route>

          {/* INSTITUTION SUPER ADMIN ROUTES - Institution owners */}
          <Route element={<RequireAuth allowedRoles={["admin", "super_admin"]} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="users" element={<Users />} />
              <Route path="groups" element={<Groups />} />
              <Route path="sinflar" element={<Sinflar />} />
              <Route path="sinf-payments/:groupId" element={<SinfPayments />} />
              <Route path="subjects" element={<Subjects />} />
              <Route path="payments" element={<Payments />} />
              <Route path="messages" element={<Messaging />} />
              <Route path="messages" element={<Messaging />} />
              <Route path="profile" element={<AdminProfile />} />
              <Route path="announcements" element={<AdminAnnouncements />} />
              <Route path="teacher-payments" element={<AdminTeacherPayments />} />
              <Route path="finance" element={<FinanceManagement />} />
              <Route path="my-salary" element={<StaffPayments />} />
              <Route path="registrar" element={<RegistrarDashboard />} />
              <Route path="academic-years" element={<AcademicYears />} />
              <Route path="grade-levels" element={<GradeLevels />} />
              <Route path="promotions" element={<RegistrarDashboard />} />
              <Route path="school-staff" element={<SchoolStaff />} />

              {/* SUPER ADMIN ONLY ROUTES */}
              <Route element={<RequireAuth allowedRoles={["super_admin"]} />}>
                <Route path="branches" element={<Branches />} />
                <Route path="marketplace" element={<Marketplace />} />
                <Route path="settings/institution" element={<InstitutionSettings />} />
                <Route path="settings/billing" element={<BillingSettings />} />
              </Route>
            </Route>
          </Route>

          {/* PARENT ROUTES */}
          <Route element={<RequireAuth allowedRoles={["parent"]} />}>
            <Route path="/parent" element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<FamilyDashboard />} />
              <Route path="messages" element={<Messaging />} />
              <Route path="profile" element={<AdminProfile />} />
            </Route>
          </Route>

          {/* STUDENT ROUTES */}
          <Route element={<RequireAuth allowedRoles={["student", "super_admin", "teacher"]} />}>
            <Route path="/student" element={<StudentLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="feed" element={<NewsFeed />} />
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="catalog" element={<CourseCatalog />} />
              <Route path="institutions" element={<StudentInstitutions />} />
              <Route path="teachers" element={<StudentTeachers />} />
              <Route path="courses" element={<StudentCourses />} />
              <Route path="achievements" element={<Achievements />} />
              <Route path="payments" element={<StudentPayments />} />
              <Route path="chat" element={<StudentChat />} />
              <Route path="rating" element={<StudentRating />} />
              <Route path="profile" element={<StudentProfile />} />
              <Route path="workbooks" element={<StudentWorkbooks />} />
              <Route path="workbooks/:id" element={<WorkbookRunner />} />
              <Route path="exams" element={<ExamDashboard />} />
              <Route path="exams/:examId/runner" element={<ExamRunner />} />
              <Route path="books/:bookId/read" element={<BookReader />} />
              <Route path="games" element={<GamesHub />} />
              <Route path="games/word-match/:levelId" element={<WordMatchGame />} />
            </Route>
          </Route>

          {/* TEACHER ROUTES */}
          <Route element={<RequireAuth allowedRoles={["teacher", "super_admin"]} />}>
            <Route path="/teacher" element={<TeacherLayout />}>
              <Route index element={<TeacherDashboard />} />
              <Route path="groups" element={<TeacherGroups />} />
              <Route path="courses" element={<TeacherCourses />} />


              <Route path="planner" element={<TeacherPlanner />} />
              {/* EXAM SYSTEM - NOW UNLOCKED */}
              <Route path="exams" element={<TeacherExams />} />
              <Route path="exams/create" element={<TeacherExamCreator />} />
              <Route path="exams/:id" element={<TeacherExamDetails />} />
              <Route path="exams/:id/preview" element={<ExamRunner />} />
              <Route path="exams/:id/results" element={<TeacherExamResults />} />
              <Route path="gradebook/exams/:examId" element={<TeacherGradebookExam />} />
              <Route path="workbooks" element={<TeacherWorkbooks />} />
              <Route path="books" element={<TeacherBooks />} />
              <Route path="books/:bookId/review" element={<TeacherReviewPage />} />
              <Route path="workbooks/:id" element={<TeacherWorkbookDetail />} />
              <Route path="materials" element={<TeacherMaterials />} />
              <Route path="attendance" element={<TeacherAttendance />} />
              <Route path="payments" element={<TeacherPayments />} />
              <Route path="chat" element={<TeacherChat />} />
              <Route path="announcements" element={<TeacherAnnouncements />} />
              <Route path="rating" element={<TeacherRating />} />
              <Route path="leaderboards" element={<TeacherLeaderboards />} />
              <Route path="profile" element={<TeacherProfile />} />
              <Route path="marketplace" element={<Marketplace />} />
            </Route>
          </Route>

          {/* STAFF ROUTES */}
          <Route element={<RequireAuth allowedRoles={["staff", "super_admin"]} />}>
            <Route path="/staff" element={<StaffLayout />}>
              <Route index element={<StaffDashboard />} />
              <Route path="branches" element={<StaffBranches />} />
              <Route path="users" element={<StaffUsers />} />
              <Route path="messages" element={<StaffMessaging />} />
              <Route path="profile" element={<StaffProfile />} />
              <Route path="payments" element={<StaffPayments />} />
            </Route>
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrandingProvider>
    </LanguageProvider>
  );
}

export default App;