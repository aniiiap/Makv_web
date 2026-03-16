import { Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { TaskManagerAuthProvider } from '../context/taskManager.AuthContext';
import { ThemeProvider } from '../context/taskManager.ThemeContext';
import { SocketProvider } from '../context/taskManager.SocketContext';
import { TimerProvider } from '../context/taskManager.TimerContext';
import Layout from './taskManager.Layout';
import PrivateRoute from './taskManager.PrivateRoute';
import AdminRoute from './taskManager.AdminRoute';
import TaskManagerLogin from '../pages/taskManager.Login';
import TaskManagerRegister from '../pages/taskManager.Register';
import TaskManagerDashboard from '../pages/taskManager.Dashboard';
import TaskManagerTasks from '../pages/taskManager.Tasks';
import TaskManagerTeams from '../pages/taskManager.Teams';
import TaskManagerCalendar from '../pages/taskManager.Calendar';
import TaskManagerAnalytics from '../pages/taskManager.Analytics';
import TaskManagerCompletedTasks from '../pages/taskManager.CompletedTasks';
import BillList from '../pages/taskManager.BillList';
import BillGenerator from '../pages/taskManager.BillGenerator';
import HUFBillGenerator from '../pages/taskManager.HUFBillGenerator';
import PaySlipGenerator from '../pages/taskManager.PaySlipGenerator';
import PaySlipList from '../pages/taskManager.PaySlipList';
import AdminDashboard from '../pages/taskManager.AdminDashboard';
import ManageUsers from '../pages/taskManager.ManageUsers';
import FirstLoginPasswordSetup from '../pages/taskManager.FirstLoginPasswordSetup';
import Clients from '../pages/taskManager.Clients';
import ClientDetail from '../pages/taskManager.ClientDetail';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const clientIdToUse = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.trim() !== ''
  ? GOOGLE_CLIENT_ID.trim()
  : 'placeholder-client-id';

function TaskFlowApp() {
  return (
    <GoogleOAuthProvider clientId={clientIdToUse}>
      <TaskManagerAuthProvider>
        <ThemeProvider>
          <SocketProvider>
            <TimerProvider>
              <Routes>
                <Route path="login" element={<TaskManagerLogin />} />
                <Route path="register" element={<TaskManagerRegister />} />
                <Route path="first-login-setup" element={
                  <PrivateRoute>
                    <FirstLoginPasswordSetup />
                  </PrivateRoute>
                } />
                <Route path="/" element={
                  <Layout>
                    <TaskManagerDashboard />
                  </Layout>
                } />
                <Route path="dashboard" element={
                  <Layout>
                    <TaskManagerDashboard />
                  </Layout>
                } />

                <Route path="tasks/new" element={
                  <PrivateRoute>
                    <Layout>
                      <TaskManagerTasks openCreate={true} />
                    </Layout>
                  </PrivateRoute>
                } />
                <Route path="tasks" element={
                  <PrivateRoute>
                    <Layout>
                      <TaskManagerTasks />
                    </Layout>
                  </PrivateRoute>
                } />
                <Route path="tasks/completed" element={
                  <PrivateRoute>
                    <Layout>
                      <TaskManagerCompletedTasks />
                    </Layout>
                  </PrivateRoute>
                } />
                <Route path="teams" element={
                  <PrivateRoute>
                    <Layout>
                      <TaskManagerTeams />
                    </Layout>
                  </PrivateRoute>
                } />
                <Route path="clients" element={
                  <PrivateRoute>
                    <Layout>
                      <Clients />
                    </Layout>
                  </PrivateRoute>
                } />
                <Route path="clients/:id" element={
                  <PrivateRoute>
                    <Layout>
                      <ClientDetail />
                    </Layout>
                  </PrivateRoute>
                } />
                <Route path="calendar" element={
                  <PrivateRoute>
                    <Layout>
                      <TaskManagerCalendar />
                    </Layout>
                  </PrivateRoute>
                } />
                <Route path="analytics" element={
                  <PrivateRoute>
                    <Layout>
                      <TaskManagerAnalytics />
                    </Layout>
                  </PrivateRoute>
                } />
                <Route path="bills" element={
                  <PrivateRoute>
                    <Layout>
                      <BillList />
                    </Layout>
                  </PrivateRoute>
                } />
                <Route path="payslips" element={
                  <AdminRoute>
                    <Layout>
                      <PaySlipList />
                    </Layout>
                  </AdminRoute>
                } />
                <Route path="bills/create" element={
                  <PrivateRoute>
                    <Layout>
                      <BillGenerator />
                    </Layout>
                  </PrivateRoute>
                } />
                <Route path="bills/create-huf" element={
                  <PrivateRoute>
                    <Layout>
                      <HUFBillGenerator />
                    </Layout>
                  </PrivateRoute>
                } />

                {/* Admin Routes */}
                <Route path="admin/dashboard" element={
                  <PrivateRoute>
                    <AdminDashboard />
                  </PrivateRoute>
                } />
                <Route path="admin/users" element={
                  <PrivateRoute>
                    <ManageUsers />
                  </PrivateRoute>
                } />
                <Route path="admin/payslip" element={
                  <AdminRoute>
                    <Layout>
                      <PaySlipGenerator />
                    </Layout>
                  </AdminRoute>
                } />

                <Route path="*" element={<Navigate to="/taskflow/login" replace />} />
              </Routes>
            </TimerProvider>
          </SocketProvider>
        </ThemeProvider>
      </TaskManagerAuthProvider>
    </GoogleOAuthProvider>
  );
}

export default TaskFlowApp;

