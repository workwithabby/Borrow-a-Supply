import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/screens.css';
import './styles/polish.css';
import './styles/pages.css';

import { route, setNotFound, start } from './router.js';
import { setUser } from './state.js';
import { getSession } from './services/auth.service.js';
import { installPressEffect } from './components/ui.js';
import { installDrawer } from './components/drawer.js';

import splash from './screens/shared/splash.js';
import welcome from './screens/shared/welcome.js';
import signup from './screens/shared/signup.js';
import verify from './screens/shared/verify.js';
import login from './screens/shared/login.js';
import forgot from './screens/shared/forgot.js';
import notifications from './screens/shared/notifications.js';
import notFound from './screens/shared/not-found.js';
import rules from './screens/shared/rules.js';
import profile from './screens/shared/profile.js';
import changePassword from './screens/shared/change-password.js';

import bHome from './screens/borrower/home.js';
import bBrowse from './screens/borrower/browse.js';
import bItem from './screens/borrower/item-details.js';
import bConfirmed from './screens/borrower/confirmed.js';
import bRentals from './screens/borrower/rentals.js';
import bRental from './screens/borrower/rental-details.js';
import bEdit from './screens/borrower/edit-profile.js';

import sQueue from './screens/staff/queue.js';
import sReservation from './screens/staff/reservation-details.js';
import sScan from './screens/staff/scan.js';
import sResult from './screens/staff/result.js';
import sInventory from './screens/staff/inventory.js';

import aDashboard from './screens/admin/dashboard.js';
import aItems from './screens/admin/items.js';
import aItemForm from './screens/admin/item-form.js';
import aPeople from './screens/admin/people.js';
import aAddStaff from './screens/admin/add-staff.js';
import aStudent from './screens/admin/student-details.js';
import aReports from './screens/admin/reports.js';
import aSettings from './screens/admin/settings.js';

// access: public | guest (logged out only) | auth | user | staff | admin
const r = (path, access, render, tabs = false) => route(path, { access, render, tabs });

// shared
r('/splash', 'public', splash);
r('/welcome', 'guest', welcome);
r('/signup', 'guest', signup);
r('/login', 'guest', login);
r('/forgot', 'guest', forgot);
r('/verify', 'public', verify);
r('/rules', 'public', rules, true);
r('/notifications', 'auth', notifications, true);
r('/account/password', 'auth', changePassword);
r('/account/edit', 'auth', bEdit);

// borrower (role: user)
r('/borrower/home', 'user', bHome, true);
r('/borrower/browse', 'user', bBrowse, true);
r('/borrower/item/:id', 'user', bItem, true);
r('/borrower/confirmed/:id', 'user', bConfirmed);
r('/borrower/rentals', 'user', bRentals, true);
r('/borrower/rental/:id', 'user', bRental, true);
r('/borrower/profile', 'user', profile, true);
r('/borrower/profile/edit', 'user', bEdit);

// staff
r('/staff/queue', 'staff', sQueue, true);
r('/staff/reservation/:id', 'staff', sReservation, true);
r('/staff/scan', 'staff', sScan, true);
r('/staff/result/:id', 'staff', sResult);
r('/staff/inventory', 'staff', sInventory, true);
r('/staff/profile', 'staff', profile, true);

// admin
r('/admin/dashboard', 'admin', aDashboard, true);
r('/admin/items', 'admin', aItems, true);
r('/admin/item/new', 'admin', aItemForm, true);
r('/admin/item/:id/edit', 'admin', aItemForm, true);
r('/admin/people', 'admin', aPeople, true);
r('/admin/staff/new', 'admin', aAddStaff, true);
r('/admin/student/:id', 'admin', aStudent, true);
r('/admin/rental/:id', 'admin', bRental, true);
r('/admin/reports', 'admin', aReports, true);
r('/admin/settings', 'admin', aSettings, true);
r('/admin/profile', 'admin', profile, true);

setNotFound({ render: notFound, tabs: true });

installPressEffect();
installDrawer();

// Find out who is logged in first, so the route guards know.
getSession().then(({ data }) => {
  setUser(data);
  start();
});
