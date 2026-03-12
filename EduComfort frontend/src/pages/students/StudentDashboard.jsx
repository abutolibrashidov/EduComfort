import React, { useMemo } from 'react';
import { getCurrentUser } from '../../api/auth';
import CenterStudentDashboard from './CenterStudentDashboard';
import SchoolStudentDashboard from './SchoolStudentDashboard';

const StudentDashboard = () => {
  const currentUser = useMemo(() => getCurrentUser(), []);

  // Default to CENTER if no type is found, or explicit CENTER
  if (currentUser?.institution_type === "SCHOOL") {
    return <SchoolStudentDashboard />;
  }

  return <CenterStudentDashboard />;
};

export default StudentDashboard;