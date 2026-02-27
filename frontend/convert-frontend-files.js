const fs = require('fs');
const path = require('path');

const taskManagerDir = path.join(__dirname, 'taskmanager');
const srcDir = path.join(__dirname, 'src');

// Files to convert
const filesToConvert = [
  { from: 'pages/Dashboard.jsx', to: 'pages/taskManager.Dashboard.jsx' },
  { from: 'pages/Tasks.jsx', to: 'pages/taskManager.Tasks.jsx' },
  { from: 'pages/Teams.jsx', to: 'pages/taskManager.Teams.jsx' },
  { from: 'pages/Calendar.jsx', to: 'pages/taskManager.Calendar.jsx' },
  { from: 'pages/Analytics.jsx', to: 'pages/taskManager.Analytics.jsx' },
];

filesToConvert.forEach(({ from, to }) => {
  const inputFile = path.join(taskManagerDir, from);
  const outputFile = path.join(srcDir, to);
  
  if (!fs.existsSync(inputFile)) {
    console.log(`Skipping ${from} - file not found`);
    return;
  }
  
  let content = fs.readFileSync(inputFile, 'utf8');
  
  // Update imports
  content = content.replace(/import api from ['"]\.\.\/utils\/api['"];?/g, "import api from '../utils/taskManager.api';");
  content = content.replace(/import \{ useAuth \} from ['"]\.\.\/context\/AuthContext['"];?/g, "import { useTaskManagerAuth } from '../context/taskManager.AuthContext';");
  content = content.replace(/import \{ useTheme \} from ['"]\.\.\/context\/ThemeContext['"];?/g, "import { useTheme } from '../context/taskManager.ThemeContext';");
  content = content.replace(/import \{ useSocket \} from ['"]\.\.\/context\/SocketContext['"];?/g, "import { useSocket } from '../context/taskManager.SocketContext';");
  content = content.replace(/import KanbanBoard from ['"]\.\.\/components\/KanbanBoard['"];?/g, "import KanbanBoard from '../components/taskManager.KanbanBoard';");
  content = content.replace(/import Layout from ['"]\.\.\/components\/Layout['"];?/g, "import Layout from '../components/taskManager.Layout';");
  content = content.replace(/import Notifications from ['"]\.\.\/components\/Notifications['"];?/g, "import Notifications from '../components/taskManager.Notifications';");
  content = content.replace(/import PrivateRoute from ['"]\.\.\/components\/PrivateRoute['"];?/g, "import PrivateRoute from '../components/taskManager.PrivateRoute';");
  
  // Update usage
  content = content.replace(/\buseAuth\(\)/g, 'useTaskManagerAuth()');
  content = content.replace(/\bconst \{ user, logout, isAuthenticated, loading, googleLogin \} = useAuth\(\)/g, 'const { user, logout, isAuthenticated, loading, googleLogin } = useTaskManagerAuth()');
  content = content.replace(/\bconst \{ isAuthenticated \} = useAuth\(\)/g, 'const { isAuthenticated } = useTaskManagerAuth()');
  content = content.replace(/\bconst \{ user \} = useAuth\(\)/g, 'const { user } = useTaskManagerAuth()');
  
  // Update routes
  content = content.replace(/to=['"]\/dashboard['"]/g, 'to="/taskflow/dashboard"');
  content = content.replace(/to=['"]\/teams['"]/g, 'to="/taskflow/teams"');
  content = content.replace(/to=['"]\/tasks['"]/g, 'to="/taskflow/tasks"');
  content = content.replace(/to=['"]\/analytics['"]/g, 'to="/taskflow/analytics"');
  content = content.replace(/to=['"]\/calendar['"]/g, 'to="/taskflow/calendar"');
  content = content.replace(/to=['"]\/login['"]/g, 'to="/taskflow/login"');
  content = content.replace(/to=['"]\/register['"]/g, 'to="/taskflow/register"');
  content = content.replace(/navigate\(['"]\/dashboard['"]\)/g, 'navigate("/taskflow/dashboard")');
  content = content.replace(/navigate\(['"]\/teams['"]\)/g, 'navigate("/taskflow/teams")');
  content = content.replace(/navigate\(['"]\/tasks['"]\)/g, 'navigate("/taskflow/tasks")');
  content = content.replace(/navigate\(['"]\/login['"]\)/g, 'navigate("/taskflow/login")');
  
  // Update API endpoints
  content = content.replace(/api\.(get|post|put|delete)\(['"]\/tasks/g, "api.$1('/tasks");
  content = content.replace(/api\.(get|post|put|delete)\(['"]\/teams/g, "api.$1('/teams");
  content = content.replace(/api\.(get|post|put|delete)\(['"]\/notifications/g, "api.$1('/notifications");
  
  fs.writeFileSync(outputFile, content, 'utf8');
  console.log(`Converted ${from} -> ${to}`);
});

console.log('Frontend file conversion complete!');

