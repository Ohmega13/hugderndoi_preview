const SETTINGS_STORAGE_KEY = 'hugderndoi-system-settings';

function loadSettingsFromLocalStorage() {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load settings from localStorage', e);
  }
  return null;
}

function saveSettingsToLocalStorage(settings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings to localStorage', e);
  }
}
let allData = [];
const defaultConfig = {
  company_name: 'ฮักเดินดอย',
  system_title: 'ระบบจัดการสต๊อก',
  background_color: '#1a1a2e',
  surface_color: '#1f2937',
  text_color: '#f3f4f6',
  primary_action_color: '#f59e0b',
  secondary_action_color: '#3b82f6'
};

let systemSettings = null;
let settingsRecord = null;
let adminUIInitialized = false;
let activeDropdownKey = 'categories';
let activeCustomerHistoryId = null;
let currentUser = null;
let googleSheetSyncState = {
  firstSyncDone: false
};
const USER_SESSION_KEY = 'hugderndoi-user-session';
let lastConnectionTest = { url: '', success: false };

function cloneDefaultAccounts() {
  return defaultUsers.map((user, index) => ({
    ...user,
    id: `account-default-${index}`
  }));
}

const dropdownMeta = {
  categories: {
    label: 'หมวดหมู่สินค้า',
    description: 'รายการหมวดหมู่ที่ใช้ในฟอร์มสินค้าและตัวกรอง'
  },
  units: {
    label: 'หน่วยนับ',
    description: 'ใช้กำหนดหน่วยในสต๊อก เช่น ชิ้น หรือ กล่อง'
  },
  brands: {
    label: 'แบรนด์',
    description: 'รายชื่อแบรนด์ที่ใช้เติมอัตโนมัติ'
  },
  colors: {
    label: 'สี',
    description: 'ชื่อสีที่ใช้บ่อย เพื่อกรอกได้สะดวก'
  },
  sizes: {
    label: 'ขนาด/ไซส์',
    description: 'ตัวเลือกไซส์สำหรับสินค้า'
  },
  suppliers: {
    label: 'ผู้จัดจำหน่าย',
    description: 'รายชื่อคู่ค้าหรือร้านค้าที่จัดส่งสินค้า'
  },
  locations: {
    label: 'ตำแหน่งจัดเก็บ',
    description: 'ตำแหน่งหรือคลังที่ใช้เก็บสินค้า'
  }
};

const availablePermissionTabs = [
  { id: 'dashboard', label: 'ภาพรวม', icon: '📊' },
  { id: 'products', label: 'สินค้า', icon: '📦' },
  { id: 'stock', label: 'นับสต๊อก', icon: '🔢' },
  { id: 'orders', label: 'ออเดอร์', icon: '🚚' },
  { id: 'customers', label: 'ลูกค้า', icon: '👥' },
  { id: 'finance', label: 'การเงิน', icon: '💰' },
  { id: 'history', label: 'ประวัติ', icon: '📜' },
  { id: 'admin', label: 'ตั้งค่า', icon: '⚙️' }
];

const defaultUsers = [
  {
    username: 'Admin',
    password: 'Admin1234',
    displayName: 'Admin',
    roleLabel: 'ผู้ดูแลระบบ',
    permissions: availablePermissionTabs.map(tab => tab.id)
  },
  {
    username: 'User',
    password: 'User1234',
    displayName: 'User',
    roleLabel: 'พนักงานขาย',
    permissions: ['products', 'orders', 'customers']
  }
];

const defaultSettings = {
  companyInfo: {
    companyName: 'ฮักเดินดอย',
    systemTitle: 'ระบบจัดการสต๊อก',
    defaultUser: 'โอห์ม',
    defaultRole: 'ผู้ดูแลระบบ'
  },
  theme: {
    background: '#1a1a2e',
    surface: '#1f2937',
    text: '#f3f4f6',
    primary: '#f59e0b',
    secondary: '#3b82f6'
  },
  dropdowns: {
    categories: ['🧥 แจ็คเก็ต', '🎒 กระเป๋า', '👟 รองเท้า', '🔧 อุปกรณ์', '👕 เสื้อผ้า', '👖 กางเกง', '🧢 หมวก', '🧦 ถุงเท้า', '📦 อื่นๆ'],
    units: ['ชิ้น', 'กล่อง', 'แพ็ค', 'คู่', 'ใบ', 'ชุด'],
    brands: ['The North Face', 'Columbia', 'Nike', 'Adidas', 'Uniqlo', 'Deuter', 'Osprey'],
    colors: ['ดำ', 'ขาว', 'น้ำเงิน', 'แดง', 'เขียว', 'เทา', 'น้ำตาล', 'ส้ม'],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'],
    suppliers: ['บริษัท ABC จำกัด', 'ห้างหุ้นส่วน XYZ', 'ร้านค้าปลีก 123'],
    locations: ['ชั้น A แถว 1', 'ชั้น A แถว 2', 'ชั้น A แถว 3', 'ชั้น B แถว 1', 'ชั้น B แถว 2', 'ชั้น C แถว 1', 'คลังหลัก', 'คลังสำรอง']
  },
  storageProfiles: [
    {
      id: 'storage-local-default',
      name: 'Local Default',
      type: 'local',
      description: 'ข้อมูลที่เก็บภายในเบราว์เซอร์',
      lastSynced: null,
      created_at: new Date().toISOString()
    }
  ],
  activeStorageId: 'storage-local-default',
  accounts: cloneDefaultAccounts(),
  roles: [
    {
      id: 'role-admin',
      name: 'ผู้ดูแลระบบ',
      description: 'เข้าถึงทุกเมนูและจัดการข้อมูลได้ทั้งหมด',
      permissions: ['dashboard', 'products', 'stock', 'orders', 'customers', 'finance', 'history', 'admin']
    }
  ],
  users: [
    {
      id: 'user-owner',
      name: 'โอห์ม',
      role: 'ผู้ดูแลระบบ',
      status: 'active'
    }
  ]
};

function cloneDefaultSettings() {
  return JSON.parse(JSON.stringify(defaultSettings));
}

function mergeSettingsData(storedSettings) {
  const merged = cloneDefaultSettings();
  if (!storedSettings) {
    return merged;
  }

  merged.companyInfo = {
    ...merged.companyInfo,
    ...(storedSettings.companyInfo || {})
  };
  merged.theme = {
    ...merged.theme,
    ...(storedSettings.theme || {})
  };
  merged.dropdowns = { ...merged.dropdowns };
  if (storedSettings.dropdowns) {
    Object.keys(merged.dropdowns).forEach(key => {
      if (Array.isArray(storedSettings.dropdowns[key]) && storedSettings.dropdowns[key].length) {
        merged.dropdowns[key] = storedSettings.dropdowns[key];
      }
    });
  }
  if (Array.isArray(storedSettings.roles) && storedSettings.roles.length) {
    merged.roles = storedSettings.roles;
  }
  if (Array.isArray(storedSettings.users) && storedSettings.users.length) {
    merged.users = storedSettings.users;
  }
  if (Array.isArray(storedSettings.accounts) && storedSettings.accounts.length) {
    merged.accounts = storedSettings.accounts;
  }
  if (Array.isArray(storedSettings.storageProfiles) && storedSettings.storageProfiles.length) {
    merged.storageProfiles = storedSettings.storageProfiles;
  }
  if (storedSettings.activeStorageId) {
    merged.activeStorageId = storedSettings.activeStorageId;
  }
  return merged;
}

function ensureDropdownDefaults(targetSettings) {
  if (!targetSettings) return;
  if (!targetSettings.dropdowns || typeof targetSettings.dropdowns !== 'object') {
    targetSettings.dropdowns = JSON.parse(JSON.stringify(defaultSettings.dropdowns));
    return;
  }
  Object.keys(defaultSettings.dropdowns).forEach(key => {
    if (!Array.isArray(targetSettings.dropdowns[key]) || !targetSettings.dropdowns[key].length) {
      targetSettings.dropdowns[key] = [...defaultSettings.dropdowns[key]];
    }
  });
}

function ensureAccountDefaults(targetSettings) {
  if (!targetSettings) return;
  if (!Array.isArray(targetSettings.accounts) || !targetSettings.accounts.length) {
    targetSettings.accounts = cloneDefaultAccounts();
  } else {
    targetSettings.accounts = targetSettings.accounts.map((account, index) => ({
      ...account,
      id: account.id || `account-${index}-${Date.now()}`
    }));
  }
}

function ensureStorageDefaults(targetSettings) {
  if (!targetSettings) return;
  if (!Array.isArray(targetSettings.storageProfiles) || !targetSettings.storageProfiles.length) {
    targetSettings.storageProfiles = JSON.parse(JSON.stringify(defaultSettings.storageProfiles));
  }
  if (!targetSettings.activeStorageId || !targetSettings.storageProfiles.some(profile => profile.id === targetSettings.activeStorageId)) {
    targetSettings.activeStorageId = targetSettings.storageProfiles[0].id;
  }
}

function getDropdownValues(key) {
  if (!key) return [];
  const hasSystemValues = systemSettings && systemSettings.dropdowns && Array.isArray(systemSettings.dropdowns[key]) && systemSettings.dropdowns[key].length;
  if (hasSystemValues) {
    return [...systemSettings.dropdowns[key]];
  }
  const fallback = defaultSettings.dropdowns?.[key] ? [...defaultSettings.dropdowns[key]] : [];
  if (systemSettings) {
    if (!systemSettings.dropdowns || typeof systemSettings.dropdowns !== 'object') {
      systemSettings.dropdowns = {};
    }
    systemSettings.dropdowns[key] = [...fallback];
  }
  return fallback;
}

function getCurrentDropdownKey() {
  const select = document.getElementById('dropdown-type-select');
  if (!select) {
    return activeDropdownKey || 'categories';
  }
  const value = select.value || select.options[select.selectedIndex]?.value;
  return value || activeDropdownKey || 'categories';
}

function showToast(message, type = 'info') {
  const existingToast = document.getElementById('toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.id = 'toast-notification';
  toast.className = 'fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg animate-slide-in';
  
  const colors = {
    success: 'bg-green-600 border-green-500',
    error: 'bg-red-600 border-red-500',
    warning: 'bg-yellow-600 border-yellow-500',
    info: 'bg-blue-600 border-blue-500'
  };
  
  toast.className += ` ${colors[type] || colors.info} border-2 text-white font-medium`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function findUserByCredentials(username, password) {
  if (!username || !password) return null;
  const accounts = getAccounts();
  return accounts.find(user =>
    user.username.toLowerCase() === username.toLowerCase() &&
    user.password === password
  ) || null;
}

function canAccessTab(tabId) {
  if (!currentUser || !Array.isArray(currentUser.permissions)) {
    return false;
  }
  return currentUser.permissions.includes(tabId);
}

function activateTab(tabName) {
  if (!tabName) return;
  try {
    localStorage.setItem('currentPage', tabName);
  } catch (e) {
    console.warn('Failed to save current page state', e);
  }
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(b => {
    b.classList.remove('border-amber-500', 'text-amber-400');
    b.classList.add('border-transparent', 'text-gray-400');
  });
  const activeBtn = Array.from(buttons).find(b => b.dataset.tab === tabName);
  if (activeBtn) {
    activeBtn.classList.add('border-amber-500', 'text-amber-400');
    activeBtn.classList.remove('border-transparent', 'text-gray-400');
  }
  document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
  const target = document.getElementById(`${tabName}-tab`);
  if (target) {
    target.classList.remove('hidden');
  }
}

function ensureActiveAccessibleTab() {
  const activeBtn = document.querySelector('.tab-btn.border-amber-500');
  if (!activeBtn || !canAccessTab(activeBtn.dataset.tab)) {
    const fallback = Array.from(document.querySelectorAll('.tab-btn')).find(btn => canAccessTab(btn.dataset.tab));
    if (fallback) {
      activateTab(fallback.dataset.tab);
    }
  }
}

function enforceTabPermissions() {
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    const allowed = canAccessTab(btn.dataset.tab);
    btn.disabled = !allowed;
    btn.classList.toggle('opacity-40', !allowed);
    btn.classList.toggle('cursor-not-allowed', !allowed);
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    const tabName = content.id.replace('-tab', '');
    if (!canAccessTab(tabName)) {
      content.classList.add('hidden');
    }
  });
  ensureActiveAccessibleTab();
}

function persistUserSession() {
  if (!currentUser) {
    try {
      localStorage.removeItem(USER_SESSION_KEY);
    } catch (error) {
      console.warn('remove session failed', error);
    }
    return;
  }
  try {
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify({
      username: currentUser.username,
      displayName: currentUser.displayName,
      roleLabel: currentUser.roleLabel,
      permissions: currentUser.permissions || []
    }));
  } catch (error) {
    console.warn('persist session failed', error);
  }
}

function updateCurrentUserUI() {
  if (!currentUser) return;
  document.getElementById('current-user-name').textContent = currentUser.displayName;
  document.getElementById('current-user-role').textContent = currentUser.roleLabel;
}

function handleLoginSuccess(user, options = {}) {
  currentUser = {
    username: user.username,
    displayName: user.displayName || user.username,
    roleLabel: user.roleLabel || user.role || 'ผู้ใช้',
    permissions: [...(user.permissions || [])]
  };
  const loginScreen = document.getElementById('login-screen');
  const appShell = document.getElementById('app-shell');
  if (loginScreen) loginScreen.classList.add('hidden');
  if (appShell) appShell.classList.remove('hidden');
  updateCurrentUserUI();
  if (!options?.skipPermissionEnforcement) {
    enforceTabPermissions();
  }
  persistUserSession();
  if (!options?.silent) {
    showToast(`ยินดีต้อนรับ ${currentUser.displayName}`, 'success');
  }
}

function resetToLogin() {
  currentUser = null;
  const loginScreen = document.getElementById('login-screen');
  const appShell = document.getElementById('app-shell');
  if (appShell) appShell.classList.add('hidden');
  if (loginScreen) loginScreen.classList.remove('hidden');
  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.reset();
  const error = document.getElementById('login-error');
  if (error) error.classList.add('hidden');
  try {
    localStorage.removeItem(USER_SESSION_KEY);
    localStorage.removeItem('currentPage');
  } catch (error) {
    console.warn('remove session failed', error);
  }
}

function restoreUserSession() {
  try {
    const stored = localStorage.getItem(USER_SESSION_KEY);
    if (!stored) return;

    const parsed = JSON.parse(stored);
    if (!parsed?.username) return;

    const { username, displayName, roleLabel, permissions } = parsed;
    const account = getAccounts().find(acc => acc.username === username);

    const performLogin = (user) => {
      handleLoginSuccess(user, { silent: true, skipPermissionEnforcement: true });
      enforceTabPermissions();
      const savedPage = localStorage.getItem('currentPage');
      if (savedPage && canAccessTab(savedPage)) {
        activateTab(savedPage);
      } else {
        ensureActiveAccessibleTab();
      }
    };

    if (account) {
      performLogin(account);
    } else {
      performLogin({
        username,
        displayName: displayName || username,
        roleLabel: roleLabel || 'ผู้ใช้',
        permissions: permissions || availablePermissionTabs.map(tab => tab.id)
      });
    }
  } catch (error) {
    console.warn('restoreUserSession failed', error);
    try {
      localStorage.removeItem(USER_SESSION_KEY);
      localStorage.removeItem('currentPage');
    } catch (e) {
      console.warn('cleanup session failed', e);
    }
  }
}

function generateCustomerId() {
  const now = new Date();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `CUST-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${random}`;
}

const dataHandler = {
  async onDataChanged(data) {
    allData = data;
    await initializeSettings();
    updateAllViews();
    if (currentUser) {
      updateCurrentUserUI();
      const loginScreen = document.getElementById('login-screen');
      const appShell = document.getElementById('app-shell');
      if (loginScreen) loginScreen.classList.add('hidden');
      if (appShell) appShell.classList.remove('hidden');
    } else {
      restoreUserSession();
    }
  }
};

function bootstrapOfflineMode() {
  const storedSettings = loadSettingsFromLocalStorage();
  if (storedSettings) {
    systemSettings = mergeSettingsData(storedSettings);
  } else {
    systemSettings = cloneDefaultSettings();
  }
  ensureDropdownDefaults(systemSettings);
  ensureAccountDefaults(systemSettings);
  ensureStorageDefaults(systemSettings);
  applySettingsToUI();
  initializeAdminEventHandlers();
  restoreUserSession();
}

async function initApp() {
  const hasDataSdk = typeof window !== 'undefined' && window.dataSdk && typeof window.dataSdk.init === 'function';
  if (!hasDataSdk) {
    console.warn('data SDK unavailable, running in offline mode');
    bootstrapOfflineMode();
    return;
  }

  const initResult = await window.dataSdk.init(dataHandler);
  if (!initResult.isOk) {
    console.error('Failed to initialize data SDK, using offline mode');
    bootstrapOfflineMode();
    return;
  }

  if (window.elementSdk) {
    window.elementSdk.init({
      defaultConfig,
      onConfigChange: async (config) => {
        document.getElementById('company-name').textContent = config.company_name || defaultConfig.company_name;
        document.getElementById('system-title').textContent = config.system_title || defaultConfig.system_title;
        
        document.body.style.background = `linear-gradient(135deg, ${config.background_color || defaultConfig.background_color} 0%, #16213e 100%)`;
        
        const surfaces = document.querySelectorAll('.bg-gray-800');
        surfaces.forEach(el => el.style.backgroundColor = config.surface_color || defaultConfig.surface_color);
        
        const textElements = document.querySelectorAll('.text-gray-100, .text-gray-300');
        textElements.forEach(el => el.style.color = config.text_color || defaultConfig.text_color);
        
        const primaryButtons = document.querySelectorAll('.bg-amber-500, .text-amber-400');
        primaryButtons.forEach(el => {
          if (el.classList.contains('bg-amber-500')) {
            el.style.backgroundColor = config.primary_action_color || defaultConfig.primary_action_color;
          } else {
            el.style.color = config.primary_action_color || defaultConfig.primary_action_color;
          }
        });
      },
      mapToCapabilities: (config) => ({
        recolorables: [
          {
            get: () => config.background_color || defaultConfig.background_color,
            set: (value) => {
              window.elementSdk.config.background_color = value;
              window.elementSdk.setConfig({ background_color: value });
            }
          },
          {
            get: () => config.surface_color || defaultConfig.surface_color,
            set: (value) => {
              window.elementSdk.config.surface_color = value;
              window.elementSdk.setConfig({ surface_color: value });
            }
          },
          {
            get: () => config.text_color || defaultConfig.text_color,
            set: (value) => {
              window.elementSdk.config.text_color = value;
              window.elementSdk.setConfig({ text_color: value });
            }
          },
          {
            get: () => config.primary_action_color || defaultConfig.primary_action_color,
            set: (value) => {
              window.elementSdk.config.primary_action_color = value;
              window.elementSdk.setConfig({ primary_action_color: value });
            }
          },
          {
            get: () => config.secondary_action_color || defaultConfig.secondary_action_color,
            set: (value) => {
              window.elementSdk.config.secondary_action_color = value;
              window.elementSdk.setConfig({ secondary_action_color: value });
            }
          }
        ],
        borderables: [],
        fontEditable: undefined,
        fontSizeable: undefined
      }),
      mapToEditPanelValues: (config) => new Map([
        ['company_name', config.company_name || defaultConfig.company_name],
        ['system_title', config.system_title || defaultConfig.system_title]
      ])
    });
  }
}

async function initializeSettings() {
  try {
    settingsRecord = allData.find(item => item.type === 'settings') || null;
    const storedSettings = loadSettingsFromLocalStorage();

    if (settingsRecord) {
      systemSettings = mergeSettingsData(settingsRecord.settings);
      // If local storage is somehow newer, consider merging. For now, sdk is king.
    } else if (storedSettings) {
      systemSettings = mergeSettingsData(storedSettings);
    } else {
      systemSettings = cloneDefaultSettings();
      const payload = {
        type: 'settings',
        settings: systemSettings,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      if (window.dataSdk && typeof window.dataSdk.create === 'function') {
        const createResult = await window.dataSdk.create(payload);
        if (!createResult.isOk) {
          console.error('ไม่สามารถสร้างข้อมูลการตั้งค่าเริ่มต้นได้');
        }
      }
    }

    ensureDropdownDefaults(systemSettings);
    ensureAccountDefaults(systemSettings);
    ensureStorageDefaults(systemSettings);
    
    applySettingsToUI();
    renderDropdownTypeOptions();
    updateDropdownEditor();
    initializeAdminEventHandlers();
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการโหลดการตั้งค่า', error);
    systemSettings = cloneDefaultSettings();
    ensureDropdownDefaults(systemSettings);
    ensureAccountDefaults(systemSettings);
    ensureStorageDefaults(systemSettings);
  }
}

async function persistSettingsChanges(successMessage) {
  if (!systemSettings) return;

  saveSettingsToLocalStorage(systemSettings);

  const payload = JSON.parse(JSON.stringify(systemSettings));
  const sdkAvailable = typeof window !== 'undefined' && window.dataSdk && typeof window.dataSdk.create === 'function';

  if (!sdkAvailable) {
    settingsRecord = settingsRecord || { type: 'settings' };
    settingsRecord.settings = payload;
    if (successMessage) {
      showToast(successMessage, 'success');
    }
    restoreUserSession();
    return;
  }

  try {
    if (settingsRecord && settingsRecord.__backendId) {
      settingsRecord.settings = payload;
      settingsRecord.updated_at = new Date().toISOString();
      const result = await window.dataSdk.update(settingsRecord);
      if (result.isOk && successMessage) {
        showToast(successMessage, 'success');
      } else if (!result.isOk) {
        showToast('ไม่สามารถบันทึกการตั้งค่าได้', 'error');
      }
      restoreUserSession();
    } else {
      const createPayload = {
        type: 'settings',
        settings: payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const createResult = await window.dataSdk.create(createPayload);
      if (createResult.isOk) {
        settingsRecord = createResult.record || createResult.value || settingsRecord || { type: 'settings' };
        settingsRecord.settings = payload;
        if (successMessage) {
          showToast(successMessage, 'success');
        }
        restoreUserSession();
      } else {
        showToast('ไม่สามารถบันทึกการตั้งค่าได้', 'error');
      }
    }
  } catch (error) {
    console.error('Failed to persist settings', error);
    if (successMessage) {
      showToast('บันทึกในหน้านี้เท่านั้น (โหมดออฟไลน์)', 'warning');
    }
    restoreUserSession();
  }
}

function applySettingsToUI() {
  if (!systemSettings) return;
  ensureStorageDefaults(systemSettings);
  applySystemBranding();
  renderDropdownOptions();
  populateAdminGeneralForm();
  renderDropdownTypeOptions();
  updateDropdownEditor();
  renderRoleList();
  ensureAccountDefaults(systemSettings);
  renderAccountPermissionOptions();
  renderUserAccounts();
  renderStorageProfiles();
  syncExternalDataIfNeeded().catch(error => console.error('syncExternalDataIfNeeded error', error));
}

function applySystemBranding() {
  if (!systemSettings) return;
  const { companyInfo, theme } = systemSettings;
  const companyNameEl = document.getElementById('company-name');
  const systemTitleEl = document.getElementById('system-title');
  const userNameEl = document.getElementById('current-user-name');
  const userRoleEl = document.getElementById('current-user-role');

  if (companyNameEl && companyInfo.companyName) {
    companyNameEl.textContent = companyInfo.companyName;
  }
  if (systemTitleEl && companyInfo.systemTitle) {
    systemTitleEl.textContent = companyInfo.systemTitle;
  }
  if (userNameEl && companyInfo.defaultUser) {
    userNameEl.textContent = companyInfo.defaultUser;
  }
  if (userRoleEl && companyInfo.defaultRole) {
    userRoleEl.textContent = companyInfo.defaultRole;
  }
  document.title = `${companyInfo.companyName || defaultConfig.company_name} - ${companyInfo.systemTitle || defaultConfig.system_title}`;

  const background = theme.background || defaultConfig.background_color;
  const surface = theme.surface || defaultConfig.surface_color;
  const textColor = theme.text || defaultConfig.text_color;

  document.body.style.background = `linear-gradient(135deg, ${background} 0%, #16213e 100%)`;

  document.querySelectorAll('.bg-gray-800').forEach(el => {
    el.style.backgroundColor = surface;
  });
  document.querySelectorAll('.text-gray-100, .text-gray-300').forEach(el => {
    el.style.color = textColor;
  });
}

function renderDropdownOptions() {
  const categories = getDropdownValues('categories');
  const units = getDropdownValues('units');
  const brands = getDropdownValues('brands');
  const colors = getDropdownValues('colors');
  const sizes = getDropdownValues('sizes');
  const suppliers = getDropdownValues('suppliers');
  const locations = getDropdownValues('locations');

  populateSelectWithValues('product-category', categories, 'เลือกหมวดหมู่');
  populateSelectWithValues('filter-category', categories, 'ทุกหมวดหมู่');
  populateSelectWithValues('filter-history-category', categories, 'ทุกหมวดหมู่');
  populateSelectWithValues('product-unit', units);
  populateDatalistOptions('brand-suggestions', brands);
  populateDatalistOptions('color-suggestions', colors);
  populateDatalistOptions('size-suggestions', sizes);
  populateDatalistOptions('supplier-suggestions', suppliers);
  populateDatalistOptions('location-suggestions', locations);
}

function populateSelectWithValues(selectId, values = [], placeholderText = null) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const previousValue = select.value;
  select.innerHTML = '';

  if (placeholderText !== null) {
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholderText;
    select.appendChild(placeholderOption);
  }

  values.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });

  if (previousValue && values.includes(previousValue)) {
    select.value = previousValue;
  } else if (placeholderText !== null) {
    select.value = '';
  } else if (values.length > 0) {
    select.value = values[0];
  }
}

function populateDatalistOptions(datalistId, values = []) {
  const datalist = document.getElementById(datalistId);
  if (!datalist) return;
  datalist.innerHTML = '';
  values.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    datalist.appendChild(option);
  });
}

function populateAdminGeneralForm() {
  if (!systemSettings) return;
  const { companyInfo, theme } = systemSettings;
  const companyInput = document.getElementById('admin-company-name');
  const systemTitleInput = document.getElementById('admin-system-title');
  const userInput = document.getElementById('admin-default-user');
  const roleInput = document.getElementById('admin-default-role');

  if (companyInput) companyInput.value = companyInfo.companyName || '';
  if (systemTitleInput) systemTitleInput.value = companyInfo.systemTitle || '';
  if (userInput) userInput.value = companyInfo.defaultUser || '';
  if (roleInput) roleInput.value = companyInfo.defaultRole || '';

  const bgInput = document.getElementById('admin-theme-background');
  const surfaceInput = document.getElementById('admin-theme-surface');
  const textInput = document.getElementById('admin-theme-text');
  const primaryInput = document.getElementById('admin-theme-primary');
  const secondaryInput = document.getElementById('admin-theme-secondary');

  if (bgInput) bgInput.value = theme.background;
  if (surfaceInput) surfaceInput.value = theme.surface;
  if (textInput) textInput.value = theme.text;
  if (primaryInput) primaryInput.value = theme.primary;
  if (secondaryInput) secondaryInput.value = theme.secondary;
}

function initializeAdminEventHandlers() {
  if (adminUIInitialized) return;
  const generalForm = document.getElementById('admin-general-form');
  if (generalForm) {
    generalForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!systemSettings) return;
      const companyInfo = systemSettings.companyInfo || {};
      const theme = systemSettings.theme || {};

      companyInfo.companyName = document.getElementById('admin-company-name')?.value.trim() || companyInfo.companyName;
      companyInfo.systemTitle = document.getElementById('admin-system-title')?.value.trim() || companyInfo.systemTitle;
      companyInfo.defaultUser = document.getElementById('admin-default-user')?.value.trim() || companyInfo.defaultUser;
      companyInfo.defaultRole = document.getElementById('admin-default-role')?.value.trim() || companyInfo.defaultRole;

      theme.background = document.getElementById('admin-theme-background')?.value || theme.background;
      theme.surface = document.getElementById('admin-theme-surface')?.value || theme.surface;
      theme.text = document.getElementById('admin-theme-text')?.value || theme.text;
      theme.primary = document.getElementById('admin-theme-primary')?.value || theme.primary;
      theme.secondary = document.getElementById('admin-theme-secondary')?.value || theme.secondary;

      systemSettings.companyInfo = companyInfo;
      systemSettings.theme = theme;

      await persistSettingsChanges('บันทึกการตั้งค่าสำเร็จ');
      applySystemBranding();
    });
  }

  const dropdownTypeSelect = document.getElementById('dropdown-type-select');
  if (dropdownTypeSelect) {
    dropdownTypeSelect.addEventListener('change', () => {
      const newKey = getCurrentDropdownKey();
      updateDropdownEditor(newKey);
    });
  }

  const dropdownAddBtn = document.getElementById('dropdown-add-btn');
  if (dropdownAddBtn) {
    dropdownAddBtn.addEventListener('click', handleAddDropdown);
  }

  const dropdownItems = document.getElementById('dropdown-items');

  const roleForm = document.getElementById('role-form');
  if (roleForm) {
    roleForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!systemSettings) return;
      const roleName = document.getElementById('admin-role-name')?.value.trim();
      const roleDescription = document.getElementById('admin-role-description')?.value.trim();
      const permissions = Array.from(document.querySelectorAll('#admin-permission-options input[type="checkbox"]:checked')).map(input => input.value);

      if (!roleName) {
        showToast('กรุณาระบุชื่อบทบาท', 'warning');
        return;
      }
      if (!permissions.length) {
        showToast('เลือกสิทธิ์อย่างน้อย 1 รายการ', 'warning');
        return;
      }
      const newRole = {
        id: `role-${Date.now()}`,
        name: roleName,
        description: roleDescription || '',
        permissions
      };
      systemSettings.roles.push(newRole);
      await persistSettingsChanges('เพิ่มบทบาทสำเร็จ');
      roleForm.reset();
      renderPermissionOptions();
      renderRoleList();
    });
  }

  const roleList = document.getElementById('role-list');
  if (roleList) {
    roleList.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-remove-role]');
      if (!button || !systemSettings) return;
      const roleId = button.dataset.removeRole;
      systemSettings.roles = systemSettings.roles.filter(role => role.id !== roleId);
      await persistSettingsChanges('ลบบทบาทแล้ว');
      renderRoleList();
    });
  }

  const accountForm = document.getElementById('user-account-form');
  if (accountForm) {
    accountForm.addEventListener('submit', handleAccountFormSubmit);
  }

  const cancelAccountEditBtn = document.getElementById('cancel-account-edit-btn');
  if (cancelAccountEditBtn) {
    cancelAccountEditBtn.addEventListener('click', resetAccountForm);
  }

  const accountList = document.getElementById('user-accounts-list');
  if (accountList) {
    accountList.addEventListener('click', async (event) => {
      const editBtn = event.target.closest('button[data-edit-account]');
      const deleteBtn = event.target.closest('button[data-delete-account]');
      if (editBtn) {
        startEditAccount(editBtn.dataset.editAccount);
      } else if (deleteBtn) {
        await deleteAccount(deleteBtn.dataset.deleteAccount);
      }
    });
  }

  const storageForm = document.getElementById('storage-form');
  if (storageForm) {
    storageForm.addEventListener('submit', handleStorageFormSubmit);
  }

  const storageList = document.getElementById('storage-list');
  if (storageList) {
    storageList.addEventListener('click', handleStorageListClick);
    storageList.addEventListener('change', handleStorageActiveChange);
  }

  const storageTypeSelect = document.getElementById('storage-type');
  if (storageTypeSelect) {
    toggleStorageGoogleFields(storageTypeSelect.value);
    storageTypeSelect.addEventListener('change', (event) => {
      toggleStorageGoogleFields(event.target.value);
    });
  }

  const testConnectionBtn = document.getElementById('test-connection-btn');
  if (testConnectionBtn) {
    testConnectionBtn.addEventListener('click', async () => {
      const apiUrl = document.getElementById('storage-api-url')?.value.trim();
      if (!apiUrl) {
        showToast('กรุณาใส่ Script URL ก่อน', 'warning');
        return;
      }
      await testGoogleSheetConnection(apiUrl);
    });
  }

  adminUIInitialized = true;
}

async function testGoogleSheetConnection(apiUrl, apiKey = null) {
  const statusEl = document.getElementById('connection-status');
  if (!statusEl) {
    console.error('Connection status element not found');
    return false;
  }

  statusEl.textContent = 'กำลังตรวจสอบ...';
  statusEl.className = 'text-xs text-yellow-400 mt-1 h-4';
  lastConnectionTest = { url: apiUrl, success: false };

  try {
    const url = new URL(apiUrl);
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'testConnection' }),
      mode: 'cors',
    };

    const response = await fetch(url.toString(), options);

    if (!response.ok) {
      throw new Error(`การเชื่อมต่อมีปัญหา (HTTP ${response.status})`);
    }

    const data = await response.json();

    if (data.ok === false) {
      throw new Error(data.message || 'Apps Script ส่งกลับมาว่าผิดพลาด');
    }

    statusEl.textContent = data.message || 'เชื่อมต่อสำเร็จ!';
    statusEl.className = 'text-xs text-green-400 mt-1 h-4';
    showToast('การเชื่อมต่อสำเร็จ', 'success');
    lastConnectionTest.success = true;
    return true;
  } catch (error) {
    const errorMessage = error.message || 'การเชื่อมต่อล้มเหลว. โปรดตรวจสอบ URL, CORS, หรือการอนุญาตของ Script';
    statusEl.textContent = errorMessage;
    statusEl.className = 'text-xs text-red-400 mt-1 h-4';
    showToast(errorMessage, 'error');
    return false;
  }
}

function renderDropdownTypeOptions() {
  const select = document.getElementById('dropdown-type-select');
  if (!select) return;
  const previousValue = select.value || activeDropdownKey || 'categories';
  const keys = Object.keys(dropdownMeta);
  if (!keys.includes(activeDropdownKey)) {
    activeDropdownKey = keys[0];
  }
  select.innerHTML = '';
  keys.forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = dropdownMeta[key].label;
    select.appendChild(option);
  });
  const valueToSet = keys.includes(previousValue) ? previousValue : activeDropdownKey;
  select.value = valueToSet;
  activeDropdownKey = select.value;
}

function updateDropdownEditor(forcedKey) {
  const listContainer = document.getElementById('dropdown-items');
  const descriptionEl = document.getElementById('dropdown-description');
  const emptyMessage = document.getElementById('dropdown-empty-message');
  const countEl = document.getElementById('dropdown-item-count');
  if (!listContainer) return;

  const select = document.getElementById('dropdown-type-select');
  const currentKey = forcedKey || getCurrentDropdownKey();
  if (select && select.value !== currentKey) {
    select.value = currentKey;
  }
  activeDropdownKey = currentKey;

  const items = getDropdownValues(activeDropdownKey);
  if (systemSettings) {
    if (!systemSettings.dropdowns || typeof systemSettings.dropdowns !== 'object') {
      systemSettings.dropdowns = {};
    }
    systemSettings.dropdowns[activeDropdownKey] = [...items];
  }
  listContainer.innerHTML = '';
  if (descriptionEl) {
    descriptionEl.textContent = dropdownMeta[activeDropdownKey]?.description || '';
  }
  if (countEl) {
    countEl.textContent = `${items.length} รายการ`;
  }
  if (!items.length) {
    if (emptyMessage) emptyMessage.classList.remove('hidden');
    return;
  }
  if (emptyMessage) emptyMessage.classList.add('hidden');
  items.forEach((value, index) => {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100';
    const label = document.createElement('span');
    label.textContent = `${index + 1}. ${value}`;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'text-xs text-red-400 hover:text-red-300 border border-red-500/40 rounded px-2 py-1';
    removeBtn.textContent = 'ลบ';
    removeBtn.onclick = () => handleRemoveDropdown(value);
    row.appendChild(label);
    row.appendChild(removeBtn);
    listContainer.appendChild(row);
  });
}

function renderRoleList() {
  const container = document.getElementById('role-list');
  if (!container) return;
  container.innerHTML = '';
  if (!systemSettings || !systemSettings.roles.length) {
    const empty = document.createElement('p');
    empty.className = 'text-sm text-gray-500';
    empty.textContent = 'ยังไม่มีข้อมูลบทบาท';
    container.appendChild(empty);
    return;
  }
  systemSettings.roles.forEach(role => {
    const card = document.createElement('div');
    card.className = 'bg-gray-900/40 border border-gray-700 rounded-lg p-4 space-y-3';
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between gap-3';
    const title = document.createElement('div');
    title.innerHTML = `<p class="text-lg font-semibold text-gray-100">${role.name}</p><p class="text-xs text-gray-400">${role.description || 'ไม่มีคำอธิบาย'}</p>`;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.dataset.removeRole = role.id;
    removeBtn.className = 'text-xs text-red-400 hover:text-red-300 border border-red-500/40 rounded px-3 py-1';
    removeBtn.textContent = 'ลบ';
    header.appendChild(title);
    header.appendChild(removeBtn);

    const permissionWrap = document.createElement('div');
    permissionWrap.className = 'flex flex-wrap gap-2 text-xs';
    role.permissions.forEach(permission => {
      const meta = availablePermissionTabs.find(tab => tab.id === permission);
      const badge = document.createElement('span');
      badge.className = 'bg-gray-800 border border-gray-700 rounded-full px-3 py-1 text-gray-200';
      badge.textContent = meta ? `${meta.icon} ${meta.label}` : permission;
      permissionWrap.appendChild(badge);
    });

    card.appendChild(header);
    card.appendChild(permissionWrap);
    container.appendChild(card);
  });
}

function renderPermissionOptions(selected = []) {
  const container = document.getElementById('admin-permission-options');
  if (!container) return;
  container.innerHTML = '';
  availablePermissionTabs.forEach(tab => {
    const label = document.createElement('label');
    label.className = 'inline-flex items-center gap-2 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = tab.id;
    checkbox.checked = selected.includes(tab.id);
    checkbox.className = 'text-amber-500 focus:ring-amber-500';
    const span = document.createElement('span');
    span.textContent = `${tab.icon} ${tab.label}`;
    label.appendChild(checkbox);
    label.appendChild(span);
    container.appendChild(label);
  });
}

function getAccounts() {
  if (systemSettings && Array.isArray(systemSettings.accounts)) {
    return systemSettings.accounts;
  }
  return cloneDefaultAccounts();
}

function renderAccountPermissionOptions(selected = []) {
  const container = document.getElementById('account-permission-options');
  if (!container) return;
  container.innerHTML = '';
  availablePermissionTabs.forEach(tab => {
    const label = document.createElement('label');
    label.className = 'flex items-center gap-2 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = tab.id;
    checkbox.checked = selected.includes(tab.id);
    checkbox.className = 'text-amber-500 focus:ring-amber-500';
    const span = document.createElement('span');
    span.textContent = `${tab.icon} ${tab.label}`;
    label.appendChild(checkbox);
    label.appendChild(span);
    container.appendChild(label);
  });
}

function renderUserAccounts() {
  const tbody = document.getElementById('user-accounts-list');
  if (!tbody) return;
  const accounts = getAccounts();
  if (!accounts.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-4 px-3 text-center text-gray-500">ยังไม่มีบัญชีผู้ใช้</td></tr>`;
    return;
  }
  tbody.innerHTML = accounts.map(account => {
    const permissions = Array.isArray(account.permissions) ? account.permissions : [];
    const permissionBadges = permissions.map(id => {
      const meta = availablePermissionTabs.find(tab => tab.id === id);
      const label = meta ? meta.label : id;
      return `<span class="inline-flex items-center gap-1 bg-gray-700 border border-gray-600 rounded-full px-2 py-0.5 text-xs">${label}</span>`;
    }).join(' ');
    return `
      <tr class="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
        <td class="py-3 px-3 font-semibold text-gray-100">${account.username}</td>
        <td class="py-3 px-3">${account.displayName || '-'}</td>
        <td class="py-3 px-3">${account.roleLabel || '-'}</td>
        <td class="py-3 px-3 space-y-1">
          ${permissionBadges || '<span class="text-xs text-gray-500">ยังไม่ได้กำหนดสิทธิ์</span>'}
        </td>
        <td class="py-3 px-3">
          <div class="flex items-center justify-center gap-3">
            <button data-edit-account="${account.id}" class="text-blue-400 hover:text-blue-300 text-sm font-medium">แก้ไข</button>
            <button data-delete-account="${account.id}" class="text-red-400 hover:text-red-300 text-sm font-medium">ลบ</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function resetAccountForm() {
  const form = document.getElementById('user-account-form');
  if (!form) return;
  form.reset();
  document.getElementById('user-account-edit-id').value = '';
  document.getElementById('account-password').value = '';
  const usernameInput = document.getElementById('account-username');
  if (usernameInput) {
    usernameInput.disabled = false;
  }
  renderAccountPermissionOptions();
  const cancelBtn = document.getElementById('cancel-account-edit-btn');
  if (cancelBtn) cancelBtn.classList.add('hidden');
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.textContent = 'เพิ่ม';
}

function populateAccountForm(account) {
  if (!account) return;
  document.getElementById('user-account-edit-id').value = account.id;
  const usernameInput = document.getElementById('account-username');
  if (usernameInput) {
    usernameInput.value = account.username || '';
    usernameInput.disabled = true;
  }
  document.getElementById('account-display-name').value = account.displayName || '';
  document.getElementById('account-role-label').value = account.roleLabel || 'User';
  document.getElementById('account-password').value = '';
  renderAccountPermissionOptions(account.permissions || []);
  const cancelBtn = document.getElementById('cancel-account-edit-btn');
  if (cancelBtn) cancelBtn.classList.remove('hidden');
  const submitBtn = document.querySelector('#user-account-form button[type="submit"]');
  if (submitBtn) submitBtn.textContent = 'บันทึกการแก้ไข';
}

function startEditAccount(accountId) {
  const accounts = getAccounts();
  const account = accounts.find(acc => acc.id === accountId);
  if (!account) {
    showToast('ไม่พบบัญชีที่ต้องการแก้ไข', 'error');
    return;
  }
  populateAccountForm(account);
  const tabBtn = document.querySelector('[data-tab="admin"]');
  if (tabBtn) tabBtn.click();
}

async function deleteAccount(accountId) {
  if (!systemSettings || !systemSettings.accounts) return;
  if (systemSettings.accounts.length <= 1) {
    showToast('ต้องมีบัญชีอย่างน้อย 1 รายการ', 'warning');
    return;
  }
  const confirmed = window.confirm('ต้องการลบบัญชีนี้หรือไม่?');
  if (!confirmed) return;
  systemSettings.accounts = systemSettings.accounts.filter(account => account.id !== accountId);
  await persistSettingsChanges('ลบบัญชีผู้ใช้แล้ว');
  renderUserAccounts();
}

function getSelectedAccountPermissions() {
  return Array.from(document.querySelectorAll('#account-permission-options input[type="checkbox"]:checked')).map(input => input.value);
}

async function handleAccountFormSubmit(event) {
  event.preventDefault();
  if (!systemSettings) return;
  ensureAccountDefaults(systemSettings);
  const editId = document.getElementById('user-account-edit-id').value;
  const username = document.getElementById('account-username').value.trim();
  const displayName = document.getElementById('account-display-name').value.trim();
  const roleLabel = document.getElementById('account-role-label').value.trim();
  const password = document.getElementById('account-password').value;
  const permissions = getSelectedAccountPermissions();

  if (!username || !displayName) {
    showToast('กรุณากรอกข้อมูลผู้ใช้ให้ครบถ้วน', 'warning');
    return;
  }
  if (!editId && (!password || password.length < 4)) {
    showToast('กรุณากรอกรหัสผ่านอย่างน้อย 4 ตัวอักษร', 'warning');
    return;
  }
  if (!permissions.length) {
    showToast('เลือกสิทธิ์การเข้าถึงอย่างน้อย 1 รายการ', 'warning');
    return;
  }

  const usernameLower = username.toLowerCase();
  const accounts = systemSettings.accounts;
  const duplicate = accounts.find(acc => acc.username.toLowerCase() === usernameLower && acc.id !== editId);
  if (duplicate) {
    showToast('มีชื่อผู้ใช้นี้ในระบบแล้ว', 'error');
    return;
  }

  if (editId) {
    const account = accounts.find(acc => acc.id === editId);
    if (!account) {
      showToast('ไม่พบบัญชีที่ต้องการแก้ไข', 'error');
      return;
    }
    account.username = username;
    account.displayName = displayName;
    account.roleLabel = roleLabel || account.roleLabel || '';
    account.permissions = permissions;
    if (password) {
      account.password = password;
    }
    await persistSettingsChanges('บันทึกการแก้ไขบัญชีแล้ว');
    if (currentUser && currentUser.username === account.username) {
      handleLoginSuccess(account, { silent: true });
    }
  } else {
    const newAccount = {
      id: `account-${Date.now()}`,
      username,
      displayName,
      roleLabel,
      password,
      permissions
    };
    accounts.push(newAccount);
    await persistSettingsChanges('เพิ่มบัญชีผู้ใช้แล้ว');
    if (currentUser && currentUser.username === username) {
      handleLoginSuccess(newAccount, { silent: true });
    }
  }
  resetAccountForm();
  renderUserAccounts();
}

function getStorageProfiles() {
  if (!systemSettings) return [];
  ensureStorageDefaults(systemSettings);
  return Array.isArray(systemSettings.storageProfiles) ? systemSettings.storageProfiles : [];
}

function getStorageTypeLabel(type) {
  const labels = {
    local: 'Local Storage',
    'google-sheet': 'Google Sheet'
  };
  return labels[type] || type || '-';
}

function formatStorageTimestamp(value) {
  if (!value) return 'ยังไม่เคยซิงค์';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'ไม่ทราบเวลา';
  }
  return date.toLocaleString('th-TH', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

function renderStorageProfiles() {
  const tbody = document.getElementById('storage-list');
  if (!tbody) return;
  const profiles = getStorageProfiles();
  if (!profiles.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-4 px-3 text-center text-gray-500">ยังไม่มี storage ถูกบันทึก</td></tr>`;
    return;
  }
  const activeId = systemSettings?.activeStorageId;
  tbody.innerHTML = profiles.map(profile => {
    const descriptionLines = [];
    if (profile.description) {
      descriptionLines.push(`<p class="text-xs text-gray-400">${profile.description}</p>`);
    }
    if (profile.type === 'google-sheet' && profile.config?.apiUrl) {
      const shortUrl = profile.config.apiUrl.length > 40 ? `${profile.config.apiUrl.slice(0, 40)}…` : profile.config.apiUrl;
      descriptionLines.push(`<p class="text-xs text-blue-300 break-all">URL: ${shortUrl}</p>`);
    }
    if (!descriptionLines.length) {
      descriptionLines.push('<p class="text-xs text-gray-500">-</p>');
    }
    return `
      <tr class="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
        <td class="py-3 px-3">
          <input type="radio" name="storage-active-radio" value="${profile.id}" ${profile.id === activeId ? 'checked' : ''} class="text-amber-500 focus:ring-amber-500">
        </td>
        <td class="py-3 px-3">
          <p class="font-semibold text-gray-100">${profile.name || '-'}</p>
          ${descriptionLines.join('')}
        </td>
        <td class="py-3 px-3">${getStorageTypeLabel(profile.type)}</td>
        <td class="py-3 px-3">${formatStorageTimestamp(profile.lastSynced)}</td>
        <td class="py-3 px-3 text-center">
          <button type="button" class="text-red-400 hover:text-red-200 text-sm font-medium" data-delete-storage="${profile.id}">ลบ</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function handleStorageFormSubmit(event) {
  if (event) {
    event.preventDefault();
  }
  if (!systemSettings) return;
  ensureStorageDefaults(systemSettings);
  const name = document.getElementById('storage-name')?.value.trim();
  const type = document.getElementById('storage-type')?.value || 'local';
  const description = document.getElementById('storage-description')?.value.trim();
  if (!name) {
    showToast('กรุณาตั้งชื่อชุดข้อมูล', 'warning');
    return;
  }

  if (systemSettings.storageProfiles.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    showToast('มีชื่อ Storage นี้อยู่แล้ว', 'warning');
    return;
  }

  const config = {};
  if (type === 'google-sheet') {
    const apiUrl = document.getElementById('storage-api-url')?.value.trim();
    const apiKey = document.getElementById('storage-api-key')?.value.trim();
    if (!apiUrl) {
      showToast('กรุณาใส่ Script URL ของ Google Sheet', 'warning');
      return;
    }

    const isConnected = await testGoogleSheetConnection(apiUrl, apiKey);
    if (!isConnected) {
      showToast('การเชื่อมต่อล้มเหลว โปรดตรวจสอบ URL และลองอีกครั้ง', 'warning');
      return;
    }

    config.apiUrl = apiUrl;
    if (apiKey) {
      config.apiKey = apiKey;
    }
  }
  const newProfile = {
    id: `storage-${Date.now()}`,
    name,
    type,
    description: description || '',
    config,
    lastSynced: null,
    created_at: new Date().toISOString()
  };
  systemSettings.storageProfiles.push(newProfile);
  if (!systemSettings.activeStorageId) {
    systemSettings.activeStorageId = newProfile.id;
  }
  await persistSettingsChanges('เพิ่ม Storage แล้ว');
  renderStorageProfiles();
  
  const form = document.getElementById('storage-form');
  if(form) form.reset();
  
  toggleStorageGoogleFields('local');
  document.getElementById('storage-type').value = 'local';
}

function handleStorageListClick(event) {
  const deleteBtn = event.target.closest('button[data-delete-storage]');
  if (deleteBtn) {
    const profileId = deleteBtn.dataset.deleteStorage;
    deleteStorageProfile(profileId);
  }
}

function handleStorageActiveChange(event) {
  const radio = event.target.closest('input[name="storage-active-radio"]');
  if (radio && radio.checked) {
    setActiveStorageProfile(radio.value);
  }
}

async function setActiveStorageProfile(profileId) {
  if (!systemSettings) return;
  ensureStorageDefaults(systemSettings);
  if (systemSettings.activeStorageId === profileId) return;
  const exists = systemSettings.storageProfiles.some(profile => profile.id === profileId);
  if (!exists) {
    showToast('ไม่พบ storage ที่เลือก', 'error');
    renderStorageProfiles();
    return;
  }
  systemSettings.activeStorageId = profileId;
  await persistSettingsChanges('เปลี่ยน Storage ที่ใช้งานแล้ว');
  renderStorageProfiles();
  syncExternalDataIfNeeded(true).catch(error => console.error('syncExternalDataIfNeeded error', error));
}

async function deleteStorageProfile(profileId) {
  if (!systemSettings) return;
  ensureStorageDefaults(systemSettings);
  if (systemSettings.storageProfiles.length <= 1) {
    showToast('ต้องมี storage อย่างน้อย 1 รายการ', 'warning');
    return;
  }
  const confirmed = window.confirm('ต้องการลบ storage นี้หรือไม่?');
  if (!confirmed) return;
  systemSettings.storageProfiles = systemSettings.storageProfiles.filter(profile => profile.id !== profileId);
  if (systemSettings.activeStorageId === profileId) {
    systemSettings.activeStorageId = systemSettings.storageProfiles[0]?.id || null;
  }
  await persistSettingsChanges('ลบ Storage แล้ว');
  renderStorageProfiles();
}

function getActiveStorageProfile() {
  ensureStorageDefaults(systemSettings);
  return systemSettings?.storageProfiles?.find(profile => profile.id === systemSettings.activeStorageId) || null;
}

function toggleStorageGoogleFields(selectedType) {
  const container = document.getElementById('storage-google-fields');
  if (!container) return;
  const inputs = container.querySelectorAll('input');
  const disabled = selectedType !== 'google-sheet';
  container.classList.toggle('opacity-60', disabled);
  container.classList.toggle('pointer-events-none', disabled);
  inputs.forEach(input => {
    input.disabled = disabled;
    if (input.id === 'storage-api-url') {
      input.required = !disabled;
    }
  });
}

function isGoogleSheetStorageActive() {
  const profile = getActiveStorageProfile();
  return Boolean(profile && profile.type === 'google-sheet' && profile.config?.apiUrl);
}

function getGoogleSheetConfig() {
  if (!isGoogleSheetStorageActive()) return null;
  const profile = getActiveStorageProfile();
  return {
    apiUrl: profile.config.apiUrl,
    apiKey: profile.config.apiKey || null
  };
}

async function googleSheetRequest(action, table, payload = {}, method = 'POST') {
  const config = getGoogleSheetConfig();
  if (!config) throw new Error('ยังไม่ได้ตั้งค่า Google Sheet');
  
  const url = new URL(config.apiUrl);
  
  // Build query parameters for GET requests
  if (method === 'GET') {
    url.searchParams.set('action', action);
    url.searchParams.set('table', table);
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    });
  }

  const options = {
    method,
    headers: {},
    mode: 'cors',
  };

  if (method !== 'GET') {
    // For POST, send parameters in a plain text body
    const postPayload = { ...payload, action, table };
    options.body = JSON.stringify(postPayload);
    options.headers['Content-Type'] = 'text/plain;charset=utf-8';
  }

  if (config.apiKey) {
    options.headers['X-API-Key'] = config.apiKey;
  }
  
  const response = await fetch(url.toString(), options);
  
  if (!response.ok) {
    throw new Error(`Google Sheet status ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data && data.ok === false) {
    throw new Error(data.message || 'Google Sheet error');
  }
  
  return data?.data ?? null;
}

function mapSheetProductToApp(row) {
  return {
    type: 'product',
    sku: row?.sku || '',
    product_name: row?.product_name || '',
    brand: row?.brand || '',
    color: row?.color || '',
    size: row?.size || '',
    category: row?.category || '',
    quantity: parseInt(row?.quantity, 10) || 0,
    unit: row?.unit || 'ชิ้น',
    cost_price: parseFloat(row?.cost_price) || 0,
    unit_price: parseFloat(row?.unit_price) || 0,
    status: row?.status || '',
    updated_at: row?.updated_at || new Date().toISOString(),
    created_at: row?.updated_at || new Date().toISOString(),
    __backendId: `gs-product-${row?.sku || Date.now()}`
  };
}

function mapAppProductToSheet(product) {
  return {
    sku: product.sku || '',
    product_name: product.product_name || '',
    brand: product.brand || '',
    color: product.color || '',
    size: product.size || '',
    category: product.category || '',
    quantity: Number(product.quantity) || 0,
    unit: product.unit || 'ชิ้น',
    cost_price: Number(product.cost_price) || 0,
    unit_price: Number(product.unit_price) || 0,
    status: product.status || '',
    updated_at: product.updated_at || new Date().toISOString()
  };
}

async function syncProductsFromGoogleSheet(force = false) {
  if (!isGoogleSheetStorageActive()) return;
  if (googleSheetSyncState.firstSyncDone && !force) return;
  try {
    const data = await googleSheetRequest('list', 'products', {}, 'GET');
    const normalized = Array.isArray(data) ? data.map(mapSheetProductToApp) : [];
    allData = allData.filter(item => item.type !== 'product');
    allData.push(...normalized);
    googleSheetSyncState.firstSyncDone = true;
    updateAllViews();
    showToast('ซิงก์สินค้าจาก Google Sheet แล้ว', 'success');
  } catch (error) {
    console.error('syncProductsFromGoogleSheet failed', error);
    showToast('เชื่อมต่อ Google Sheet ไม่สำเร็จ', 'error');
  }
}

async function syncExternalDataIfNeeded(force = false) {
  if (!isGoogleSheetStorageActive()) return;
  await syncProductsFromGoogleSheet(force);
  await syncCustomersFromGoogleSheet(force);
}

async function pushProductToGoogleSheet(product) {
  if (!isGoogleSheetStorageActive()) return;
  try {
    await googleSheetRequest('save', 'products', mapAppProductToSheet(product));
  } catch (error) {
    console.error('pushProductToGoogleSheet failed', error);
    showToast('เชื่อม Google Sheet ไม่สำเร็จ (สินค้า)', 'warning');
  }
}

async function deleteProductOnGoogleSheet(sku) {
  if (!isGoogleSheetStorageActive()) return;
  try {
    const payload = { id: sku, sku, action: 'delete', table: 'products' };
    await googleSheetRequest('delete', 'products', payload, 'POST');
  } catch (error) {
    console.error('deleteProductOnGoogleSheet failed', error);
    showToast('ลบสินค้าใน Google Sheet ไม่สำเร็จ', 'warning');
  }
}

function mapSheetCustomerToApp(row) {
  return {
    type: 'customer',
    id: row?.customer_id || `gs-cust-${Date.now()}`,
    name: row?.name || '',
    phone: row?.phone || '',
    email: row?.email || '',
    address: row?.address || '',
    note: row?.note || '',
    last_order_at: row?.last_order_at || null,
    created_at: row?.updated_at || new Date().toISOString(),
    updated_at: row?.updated_at || new Date().toISOString(),
    __backendId: `gs-cust-${row?.customer_id}`
  };
}

function mapAppCustomerToSheet(customer) {
  return {
    customer_id: getCustomerIdentifier(customer) || '',
    name: customer.name || '',
    phone: customer.phone || '',
    email: customer.email || '',
    address: customer.address || '',
    note: customer.note || '',
    last_order_at: customer.last_order_at || '',
    updated_at: customer.updated_at || new Date().toISOString(),
  };
}

async function pushCustomerToGoogleSheet(customer) {
  if (!isGoogleSheetStorageActive()) return;
  try {
    await googleSheetRequest('save', 'customers', mapAppCustomerToSheet(customer));
    showToast('ซิงค์ข้อมูลลูกค้าไป Google Sheet แล้ว', 'success');
  } catch (error) {
    console.error('pushCustomerToGoogleSheet failed', error);
    showToast('เชื่อม Google Sheet ไม่สำเร็จ (ลูกค้า)', 'warning');
  }
}

async function syncCustomersFromGoogleSheet(force = false) {
  if (!isGoogleSheetStorageActive()) return;

  try {
    const data = await googleSheetRequest('list', 'customers', {}, 'GET');
    if (Array.isArray(data)) {
      const normalized = data.map(mapSheetCustomerToApp);
      // Remove existing customer data and add fresh data
      allData = allData.filter(item => item.type !== 'customer');
      allData.push(...normalized);
      updateCustomerUI();
    }
  } catch (error) {
    console.error('syncCustomersFromGoogleSheet failed', error);
    showToast('เชื่อมต่อ Google Sheet ไม่สำเร็จ (ลูกค้า)', 'error');
  }
}

function updateAllViews() {
  updateDashboard();
  updateProductsList();
  updateStockCount();
  updateDamagedList();
  updateOrdersList();
  updateFinance();
  updateProductSelects();
  updateCustomerUI();
  updateHistory();
  if (currentUser) {
    const loginScreen = document.getElementById('login-screen');
    const appShell = document.getElementById('app-shell');
    if (loginScreen) loginScreen.classList.add('hidden');
    if (appShell) appShell.classList.remove('hidden');
  }
}

function updateDashboard() {
  const products = allData.filter(item => item.type === 'product');
  const damaged = allData.filter(item => item.type === 'damaged');
  const orders = allData.filter(item => item.type === 'order');
  
  // กรองตามช่วงเวลา
  const periodFilter = document.getElementById('dashboard-period-filter')?.value || 'all';
  const now = new Date();
  
  let filteredOrders = orders;
  let filteredDamaged = damaged;
  let periodLabel = 'แสดงข้อมูลทั้งหมด';
  
  if (periodFilter !== 'all') {
    const customStart = document.getElementById('dashboard-start-date')?.value;
    const customEnd = document.getElementById('dashboard-end-date')?.value;
    
    filteredOrders = orders.filter(o => {
      const orderDate = new Date(o.created_at);
      return isInPeriod(orderDate, periodFilter, now, customStart, customEnd);
    });
    
    filteredDamaged = damaged.filter(d => {
      const damageDate = new Date(d.created_at);
      return isInPeriod(damageDate, periodFilter, now, customStart, customEnd);
    });
    
    if (periodFilter === 'today') {
      periodLabel = `วันนี้ (${now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })})`;
    } else if (periodFilter === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      periodLabel = `เมื่อวาน (${yesterday.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })})`;
    } else if (periodFilter === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      periodLabel = `สัปดาห์นี้ (${weekStart.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })})`;
    } else if (periodFilter === 'last-week') {
      const lastWeekEnd = new Date(now);
      lastWeekEnd.setDate(now.getDate() - now.getDay() - 1);
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
      periodLabel = `สัปดาห์ที่แล้ว (${lastWeekStart.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${lastWeekEnd.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })})`;
    } else if (periodFilter === 'month') {
      periodLabel = `เดือนนี้ (${now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })})`;
    } else if (periodFilter === 'last-month') {
      const lastMonth = new Date(now);
      lastMonth.setMonth(now.getMonth() - 1);
      periodLabel = `เดือนที่แล้ว (${lastMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })})`;
    } else if (periodFilter === 'year') {
      periodLabel = `ปีนี้ (${now.toLocaleDateString('th-TH', { year: 'numeric' })})`;
    } else if (periodFilter === 'last-year') {
      periodLabel = `ปีที่แล้ว (${(now.getFullYear() - 1).toString()})`;
    } else if (periodFilter === 'custom' && customStart && customEnd) {
      const startDate = new Date(customStart);
      const endDate = new Date(customEnd);
      periodLabel = `${startDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
  }
  
  document.getElementById('dashboard-period-label').textContent = periodLabel;
  
  const deliveredOrders = filteredOrders.filter(o => o.status === 'จัดส่งแล้ว');

  // การ์ดหลัก
  document.getElementById('total-products').textContent = products.length;
  document.getElementById('total-sku').textContent = products.length;
  
  const stockValue = products.reduce((sum, p) => sum + (p.quantity * p.cost_price), 0);
  const stockRetailValue = products.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0);
  document.getElementById('total-stock-value').textContent = `฿${stockValue.toLocaleString('th-TH', {minimumFractionDigits: 0})}`;
  document.getElementById('total-stock-retail').textContent = `฿${stockRetailValue.toLocaleString('th-TH', {minimumFractionDigits: 0})}`;
  
  // คำนวณยอดขายและกำไร
  let totalSales = 0;
  let totalCost = 0;
  let totalShipping = 0;
  deliveredOrders.forEach(order => {
    const product = products.find(p => p.sku === order.sku);
    if (product) {
      totalSales += order.quantity * product.unit_price;
      totalCost += order.quantity * product.cost_price;
      totalShipping += order.shipping_cost || 0;
    }
  });
  
  const damagedValue = filteredDamaged.reduce((sum, d) => {
    const product = products.find(p => p.sku === d.sku);
    return sum + (product ? d.quantity * product.cost_price : 0);
  }, 0);
  
  const netProfit = totalSales - totalCost - totalShipping - damagedValue;
  
  document.getElementById('dashboard-total-sales').textContent = `฿${totalSales.toLocaleString('th-TH', {minimumFractionDigits: 0})}`;
  document.getElementById('dashboard-net-profit').textContent = `฿${netProfit.toLocaleString('th-TH', {minimumFractionDigits: 0})}`;
  
  document.getElementById('dashboard-total-orders').textContent = filteredOrders.length;
  const pendingOrders = filteredOrders.filter(o => o.status === 'รอจัดส่ง').length;
  document.getElementById('pending-orders').textContent = pendingOrders;

  // สถิติเพิ่มเติม
  const avgMargin = products.length > 0 ? products.reduce((sum, p) => {
    return sum + ((p.unit_price - p.cost_price) / p.unit_price * 100);
  }, 0) / products.length : 0;
  document.getElementById('dashboard-avg-margin').textContent = `${avgMargin.toFixed(1)}%`;
  document.getElementById('dashboard-margin-bar').style.width = `${Math.min(avgMargin, 100)}%`;

  const lowStock = products.filter(p => {
    const minStock = p.min_stock || 10;
    return p.quantity < minStock;
  });
  document.getElementById('dashboard-low-stock-count').textContent = lowStock.length;
  const lowStockPercent = products.length > 0 ? (lowStock.length / products.length * 100) : 0;
  document.getElementById('dashboard-low-stock-bar').style.width = `${Math.min(lowStockPercent, 100)}%`;

  document.getElementById('dashboard-damaged-value').textContent = `฿${damagedValue.toLocaleString('th-TH', {minimumFractionDigits: 0})}`;
  document.getElementById('total-damaged').textContent = `${filteredDamaged.length} รายการ`;

  // สินค้าขายดี Top 5
  const salesByProduct = {};
  deliveredOrders.forEach(order => {
    if (!salesByProduct[order.sku]) {
      salesByProduct[order.sku] = {
        sku: order.sku,
        name: order.product_name,
        quantity: 0,
        revenue: 0
      };
    }
    const product = products.find(p => p.sku === order.sku);
    if (product) {
      salesByProduct[order.sku].quantity += order.quantity;
      salesByProduct[order.sku].revenue += order.quantity * product.unit_price;
    }
  });

  const topSelling = Object.values(salesByProduct)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const topSellingList = document.getElementById('top-selling-list');
  if (topSelling.length === 0) {
    topSellingList.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">ยังไม่มีข้อมูลการขาย</p>';
  } else {
    topSellingList.innerHTML = topSelling.map((item, index) => {
      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      return `
        <div class="bg-gray-700 rounded-lg p-3">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="text-xl">${medals[index]}</span>
              <div>
                <p class="text-gray-100 font-medium text-sm">${item.name}</p>
                <p class="text-gray-500 text-xs">SKU: ${item.sku}</p>
              </div>
            </div>
          </div>
          <div class="flex justify-between items-center text-xs">
            <span class="text-gray-400">ขายได้ ${item.quantity} ชิ้น</span>
            <span class="text-green-400 font-semibold">฿${item.revenue.toLocaleString('th-TH', {minimumFractionDigits: 0})}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // สินค้าใกล้หมด
  const lowStockList = document.getElementById('low-stock-list');
  if (lowStock.length === 0) {
    lowStockList.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">ไม่มีสินค้าใกล้หมด</p>';
  } else {
    lowStockList.innerHTML = lowStock.slice(0, 5).map(p => {
      const minStock = p.min_stock || 10;
      const stockPercent = (p.quantity / minStock * 100);
      return `
        <div class="bg-gray-700 rounded-lg p-3">
          <div class="flex justify-between items-center mb-2">
            <div>
              <p class="text-gray-100 font-medium text-sm">${p.product_name}</p>
              <p class="text-gray-500 text-xs">SKU: ${p.sku}</p>
            </div>
            <span class="text-red-400 font-bold">${p.quantity} ${p.unit || 'ชิ้น'}</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="flex-1 bg-gray-600 rounded-full h-2">
              <div class="bg-red-500 h-2 rounded-full" style="width: ${Math.min(stockPercent, 100)}%"></div>
            </div>
            <span class="text-xs text-gray-400">ต่ำสุด ${minStock}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // ออเดอร์ล่าสุด
  const recentOrdersList = document.getElementById('recent-orders-list');
  const recentOrders = orders.slice(-5).reverse();
  if (recentOrders.length === 0) {
    recentOrdersList.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">ยังไม่มีออเดอร์</p>';
  } else {
    recentOrdersList.innerHTML = recentOrders.map(o => {
      let statusColor = 'bg-gray-600';
      let statusIcon = '📦';
      if (o.status === 'รอจัดส่ง') { statusColor = 'bg-yellow-600'; statusIcon = '⏳'; }
      else if (o.status === 'กำลังเตรียมสินค้า') { statusColor = 'bg-orange-600'; statusIcon = '📋'; }
      else if (o.status === 'พร้อมจัดส่ง') { statusColor = 'bg-purple-600'; statusIcon = '📦'; }
      else if (o.status === 'กำลังจัดส่ง') { statusColor = 'bg-blue-600'; statusIcon = '🚚'; }
      else if (o.status === 'จัดส่งแล้ว') { statusColor = 'bg-green-600'; statusIcon = '✅'; }
      else if (o.status === 'ยกเลิก') { statusColor = 'bg-red-600'; statusIcon = '❌'; }
      
      const date = new Date(o.created_at);
      const dateStr = date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
      
      return `
        <div class="bg-gray-700 rounded-lg p-3">
          <div class="flex justify-between items-start mb-2">
            <div>
              <p class="text-gray-100 font-medium text-sm">${o.order_id}</p>
              <p class="text-gray-400 text-xs">${o.customer_name}</p>
            </div>
            <span class="text-xs px-2 py-1 rounded font-medium ${statusColor}">${statusIcon} ${o.status}</span>
          </div>
          <div class="flex justify-between items-center text-xs">
            <span class="text-gray-400">${o.product_name}</span>
            <span class="text-gray-500">${dateStr}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // กิจกรรมล่าสุด
  const activities = [];
  
  // เพิ่มกิจกรรมจากประวัติสินค้า
  const history = allData.filter(item => item.type === 'history' || item.type === 'stock_history')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 3);
  
  history.forEach(h => {
    const date = new Date(h.created_at);
    const timeAgo = getTimeAgo(date);
    if (h.type === 'history') {
      activities.push({
        icon: '📦',
        color: 'text-blue-400',
        text: `เพิ่มสินค้าใหม่: ${h.product_name}`,
        detail: `จำนวน ${h.initial_quantity} ${h.unit || 'ชิ้น'}`,
        time: timeAgo
      });
    } else if (h.type === 'stock_history') {
      activities.push({
        icon: '➕',
        color: 'text-green-400',
        text: `เพิ่มสต๊อก: ${h.product_name}`,
        detail: `+${h.quantity_added} ${h.unit || 'ชิ้น'} (${h.old_quantity} → ${h.new_quantity})`,
        time: timeAgo
      });
    }
  });
  
  // เพิ่มกิจกรรมจากออเดอร์ล่าสุด
  const recentOrderActivities = orders
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 2);
  
  recentOrderActivities.forEach(o => {
    const date = new Date(o.created_at);
    const timeAgo = getTimeAgo(date);
    activities.push({
      icon: '🚚',
      color: 'text-purple-400',
      text: `สร้างออเดอร์: ${o.order_id}`,
      detail: `${o.customer_name} - ${o.product_name}`,
      time: timeAgo
    });
  });

  const activitiesList = document.getElementById('recent-activities-list');
  if (activities.length === 0) {
    activitiesList.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">ยังไม่มีกิจกรรม</p>';
  } else {
    activitiesList.innerHTML = activities.slice(0, 5).map(a => `
      <div class="bg-gray-700 rounded-lg p-3">
        <div class="flex items-start gap-3">
          <span class="text-xl ${a.color}">${a.icon}</span>
          <div class="flex-1">
            <p class="text-gray-100 text-sm font-medium">${a.text}</p>
            <p class="text-gray-400 text-xs mt-1">${a.detail}</p>
            <p class="text-gray-500 text-xs mt-1">${a.time}</p>
          </div>
        </div>
      </div>
    `).join('');
  }
}

function isInPeriod(date, period, now, customStart = null, customEnd = null) {
  const dateObj = new Date(date);
  dateObj.setHours(0, 0, 0, 0);
  const nowObj = new Date(now);
  nowObj.setHours(0, 0, 0, 0);
  
  if (period === 'today') {
    return dateObj.getTime() === nowObj.getTime();
  } else if (period === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    return dateObj.getTime() === yesterday.getTime();
  } else if (period === 'week') {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return dateObj >= weekStart && dateObj <= nowObj;
  } else if (period === 'last-week') {
    const lastWeekEnd = new Date(now);
    lastWeekEnd.setDate(now.getDate() - now.getDay() - 1);
    lastWeekEnd.setHours(0, 0, 0, 0);
    const lastWeekStart = new Date(lastWeekEnd);
    lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
    return dateObj >= lastWeekStart && dateObj <= lastWeekEnd;
  } else if (period === 'month') {
    return dateObj.getMonth() === now.getMonth() && dateObj.getFullYear() === now.getFullYear();
  } else if (period === 'last-month') {
    const lastMonth = new Date(now);
    lastMonth.setMonth(now.getMonth() - 1);
    return dateObj.getMonth() === lastMonth.getMonth() && dateObj.getFullYear() === lastMonth.getFullYear();
  } else if (period === 'year') {
    return dateObj.getFullYear() === now.getFullYear();
  } else if (period === 'last-year') {
    return dateObj.getFullYear() === now.getFullYear() - 1;
  } else if (period === 'custom' && customStart && customEnd) {
    const startObj = new Date(customStart);
    startObj.setHours(0, 0, 0, 0);
    const endObj = new Date(customEnd);
    endObj.setHours(23, 59, 59, 999);
    return dateObj >= startObj && dateObj <= endObj;
  }
  return true;
}

function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'เมื่อสักครู่';
  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
  return date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
}

function updateProductsList() {
  const products = allData.filter(item => item.type === 'product');
  document.getElementById('product-count').textContent = products.length;
  
  // อัพเดทรายการแบรนด์ในตัวกรอง
  const brands = [...new Set(products.map(p => p.brand).filter(b => b))];
  const brandFilter = document.getElementById('filter-brand');
  const currentBrand = brandFilter.value;
  brandFilter.innerHTML = '<option value="">ทั้งหมด</option>' + 
    brands.map(b => `<option value="${b}">${b}</option>`).join('');
  brandFilter.value = currentBrand;
  
  // กรองสินค้าตามเงื่อนไข
  const searchTerm = document.getElementById('search-product')?.value.toLowerCase() || '';
  const categoryFilter = document.getElementById('filter-category')?.value || '';
  const brandFilterValue = document.getElementById('filter-brand')?.value || '';
  const stockFilter = document.getElementById('filter-stock')?.value || '';
  
  let filteredProducts = products.filter(product => {
    // ค้นหาตามคำค้น
    const matchSearch = !searchTerm || 
      product.product_name.toLowerCase().includes(searchTerm) ||
      product.sku.toLowerCase().includes(searchTerm) ||
      (product.brand && product.brand.toLowerCase().includes(searchTerm)) ||
      (product.model && product.model.toLowerCase().includes(searchTerm)) ||
      (product.color && product.color.toLowerCase().includes(searchTerm)) ||
      (product.size && product.size.toLowerCase().includes(searchTerm));
    
    // กรองตามหมวดหมู่
    const matchCategory = !categoryFilter || product.category === categoryFilter;
    
    // กรองตามแบรนด์
    const matchBrand = !brandFilterValue || product.brand === brandFilterValue;
    
    // กรองตามสถานะสต๊อก
    let matchStock = true;
    if (stockFilter === 'low') {
      const minStock = product.min_stock || 10;
      matchStock = product.quantity < minStock;
    } else if (stockFilter === 'normal') {
      const minStock = product.min_stock || 10;
      const maxStock = product.max_stock || 100;
      matchStock = product.quantity >= minStock && product.quantity <= maxStock;
    } else if (stockFilter === 'high') {
      const maxStock = product.max_stock || 100;
      matchStock = product.quantity > maxStock;
    }
    
    return matchSearch && matchCategory && matchBrand && matchStock;
  });
  
  const tbody = document.getElementById('products-list');
  document.getElementById('filtered-count').textContent = filteredProducts.length;
  
  if (filteredProducts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-8 text-gray-400">ไม่พบสินค้าที่ตรงกับเงื่อนไข</td></tr>';
    return;
  }

  tbody.innerHTML = filteredProducts.map(product => {
    const minStock = product.min_stock || 10;
    const isLowStock = product.quantity < minStock;
    
    const brandModel = [
      product.brand || '',
      product.model || ''
    ].filter(x => x).join(' - ') || '-';
    
    const colorSize = [
      product.color || '',
      product.size || ''
    ].filter(x => x).join(' / ') || '-';
    
    return `
    <tr class="border-b border-gray-700 hover:bg-gray-700 transition-colors">
      <td class="py-3 px-2 font-mono text-amber-400">${product.sku}</td>
      <td class="py-3 px-2">
        <div class="font-medium">${product.product_name}</div>
        ${product.year ? `<div class="text-xs text-gray-500">ปี ${product.year}</div>` : ''}
      </td>
      <td class="py-3 px-2 text-gray-400 text-sm">${brandModel}</td>
      <td class="py-3 px-2 text-gray-400 text-sm">${colorSize}</td>
      <td class="py-3 px-2">
        <span class="inline-block px-2 py-1 text-xs rounded-full bg-gray-700">${product.category}</span>
      </td>
      <td class="py-3 px-2 text-right font-semibold ${isLowStock ? 'text-red-400' : 'text-green-400'}">${product.quantity} ${product.unit || 'ชิ้น'}</td>
      <td class="py-3 px-2 text-right text-gray-400">฿${product.cost_price.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
      <td class="py-3 px-2 text-right font-semibold">฿${product.unit_price.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
      <td class="py-3 px-2 text-center">
        <div class="flex justify-center gap-2">
          <button onclick="editProduct('${product.__backendId}')" class="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">✏️ แก้ไข</button>
          <button onclick="deleteProduct('${product.__backendId}')" class="text-red-400 hover:text-red-300 text-sm font-medium transition-colors">🗑️ ลบ</button>
        </div>
      </td>
    </tr>
  `}).join('');
}

function updateStockCount() {
  const products = allData.filter(item => item.type === 'product');
  const container = document.getElementById('stock-count-list');
  
  if (products.length === 0) {
    container.innerHTML = '<p class="text-gray-400">ยังไม่มีสินค้าในระบบ</p>';
    return;
  }

  container.innerHTML = products.map(product => {
    const details = [
      product.brand || '',
      product.model || '',
      product.color || '',
      product.size || ''
    ].filter(x => x).join(' | ') || 'ไม่ระบุรายละเอียด';
    
    const minStock = product.min_stock || 10;
    const maxStock = product.max_stock || 100;
    const isLowStock = product.quantity < minStock;
    const isHighStock = product.quantity > maxStock;
    
    let stockStatus = '';
    let stockStatusColor = '';
    if (isLowStock) {
      stockStatus = '⚠️ ใกล้หมด';
      stockStatusColor = 'text-red-400';
    } else if (isHighStock) {
      stockStatus = '📈 เกินกำหนด';
      stockStatusColor = 'text-yellow-400';
    } else {
      stockStatus = '✓ ปกติ';
      stockStatusColor = 'text-green-400';
    }
    
    const stockValue = product.quantity * product.cost_price;
    
    return `
    <div class="bg-gray-700 rounded-lg p-4">
      <div class="flex justify-between items-start mb-3">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <p class="font-semibold text-gray-100 text-lg">${product.product_name}</p>
            <span class="text-xs px-2 py-1 rounded-full bg-gray-600">${product.category}</span>
          </div>
          <p class="text-sm text-gray-400 mb-1">SKU: <span class="font-mono text-amber-400">${product.sku}</span></p>
          <p class="text-xs text-gray-500">${details}</p>
        </div>
        <div class="text-right">
          <p class="text-xs text-gray-400">สถานะสต๊อก</p>
          <p class="text-sm font-semibold ${stockStatusColor}">${stockStatus}</p>
        </div>
      </div>
      
      <div class="grid grid-cols-3 gap-3 mb-3 text-center">
        <div class="bg-gray-800 rounded p-2">
          <p class="text-xs text-gray-400">สต๊อกต่ำสุด</p>
          <p class="text-sm font-semibold text-gray-300">${minStock}</p>
        </div>
        <div class="bg-gray-800 rounded p-2">
          <p class="text-xs text-gray-400">สต๊อกสูงสุด</p>
          <p class="text-sm font-semibold text-gray-300">${maxStock}</p>
        </div>
        <div class="bg-gray-800 rounded p-2">
          <p class="text-xs text-gray-400">มูลค่าสต๊อก</p>
          <p class="text-sm font-semibold text-blue-400">฿${stockValue.toLocaleString('th-TH', {minimumFractionDigits: 0})}</p>
        </div>
      </div>
      
      <div class="flex items-center justify-between bg-gray-800 rounded-lg p-3">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-400">ตำแหน่ง:</span>
          <span class="text-sm font-medium text-gray-200">${product.location || 'ไม่ระบุ'}</span>
        </div>
        <div class="flex items-center space-x-3">
          <button onclick="adjustStock('${product.__backendId}', -1)" class="bg-red-500 hover:bg-red-600 text-white w-10 h-10 rounded-lg font-bold text-lg transition-colors">-</button>
          <div class="text-center">
            <p class="text-2xl font-bold text-amber-400">${product.quantity}</p>
            <p class="text-xs text-gray-400">${product.unit || 'ชิ้น'}</p>
          </div>
          <button onclick="adjustStock('${product.__backendId}', 1)" class="bg-green-500 hover:bg-green-600 text-white w-10 h-10 rounded-lg font-bold text-lg transition-colors">+</button>
        </div>
      </div>
    </div>
  `}).join('');
}

function updateDamagedList() {
  const damaged = allData.filter(item => item.type === 'damaged');
  const tbody = document.getElementById('damaged-list');
  
  if (damaged.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-400">ยังไม่มีรายการสินค้าชำรุด</td></tr>';
    return;
  }

  tbody.innerHTML = damaged.map(item => {
    const date = new Date(item.created_at);
    const product = allData.find(p => p.type === 'product' && p.sku === item.sku);
    const loss = product ? item.quantity * product.cost_price : 0;
    
    return `
      <tr class="border-b border-gray-700 hover:bg-gray-700 transition-colors">
        <td class="py-3 px-2">${date.toLocaleDateString('th-TH')}</td>
        <td class="py-3 px-2">${item.product_name}</td>
        <td class="py-3 px-2 text-right">${item.quantity}</td>
        <td class="py-3 px-2">${item.damage_reason}</td>
        <td class="py-3 px-2 text-right text-red-400">฿${loss.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
        <td class="py-3 px-2 text-center">
          <div class="flex justify-center gap-2">
            <button onclick="editDamaged('${item.__backendId}')" class="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">✏️ แก้ไข</button>
            <button onclick="deleteDamaged('${item.__backendId}')" class="text-red-400 hover:text-red-300 text-sm font-medium transition-colors">🗑️ ลบ</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function updateOrdersList() {
  const orders = allData.filter(item => item.type === 'order');
  const statusFilter = document.getElementById('filter-order-status')?.value || '';
  
  let filteredOrders = orders;
  if (statusFilter) {
    filteredOrders = orders.filter(o => o.status === statusFilter);
  }
  
  const tbody = document.getElementById('orders-list');
  document.getElementById('order-count').textContent = filteredOrders.length;
  
  if (filteredOrders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-400">ไม่พบออเดอร์ที่ตรงกับเงื่อนไข</td></tr>';
    return;
  }

  tbody.innerHTML = filteredOrders.map(order => {
    let statusColor = 'bg-gray-600';
    if (order.status === 'รอจัดส่ง') statusColor = 'bg-yellow-600';
    else if (order.status === 'กำลังเตรียมสินค้า') statusColor = 'bg-orange-600';
    else if (order.status === 'พร้อมจัดส่ง') statusColor = 'bg-purple-600';
    else if (order.status === 'กำลังจัดส่ง') statusColor = 'bg-blue-600';
    else if (order.status === 'จัดส่งแล้ว') statusColor = 'bg-green-600';
    else if (order.status === 'ยกเลิก') statusColor = 'bg-red-600';
    
    return `
    <tr class="border-b border-gray-700 hover:bg-gray-700 transition-colors">
      <td class="py-3 px-2 font-mono text-amber-400">${order.order_id}</td>
      <td class="py-3 px-2 font-medium">${order.customer_name}</td>
      <td class="py-3 px-2">${order.product_name}</td>
      <td class="py-3 px-2 text-right font-semibold">${order.quantity}</td>
      <td class="py-3 px-2 text-gray-400">${order.courier || '-'}</td>
      <td class="py-3 px-2 font-mono text-sm text-gray-400">${order.tracking_number || '-'}</td>
      <td class="py-3 px-2">
        <span class="text-xs px-2 py-1 rounded font-medium ${statusColor}">${order.status}</span>
      </td>
      <td class="py-3 px-2 text-center">
        <div class="flex justify-center gap-2">
          <button onclick="viewTracking('${order.__backendId}')" class="text-green-400 hover:text-green-300 text-sm font-medium transition-colors" title="ดูประวัติการจัดส่ง">📦</button>
          <button onclick="editOrder('${order.__backendId}')" class="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">✏️</button>
          <button onclick="deleteOrder('${order.__backendId}')" class="text-red-400 hover:text-red-300 text-sm font-medium transition-colors">🗑️</button>
        </div>
      </td>
    </tr>
  `}).join('');
}

function updateFinance() {
  const products = allData.filter(item => item.type === 'product');
  
  // กรองตามช่วงเวลา
  const periodFilter = document.getElementById('finance-period-filter')?.value || 'all';
  const now = new Date();
  
  let filteredOrders = allData.filter(item => item.type === 'order' && item.status === 'จัดส่งแล้ว');
  let filteredDamaged = allData.filter(item => item.type === 'damaged');
  let periodLabel = 'แสดงข้อมูลทั้งหมด';
  
  if (periodFilter !== 'all') {
    const customStart = document.getElementById('finance-start-date')?.value;
    const customEnd = document.getElementById('finance-end-date')?.value;
    
    filteredOrders = filteredOrders.filter(o => {
      const orderDate = new Date(o.created_at);
      return isInPeriod(orderDate, periodFilter, now, customStart, customEnd);
    });
    
    filteredDamaged = filteredDamaged.filter(d => {
      const damageDate = new Date(d.created_at);
      return isInPeriod(damageDate, periodFilter, now, customStart, customEnd);
    });
    
    if (periodFilter === 'today') {
      periodLabel = `วันนี้ (${now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })})`;
    } else if (periodFilter === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      periodLabel = `เมื่อวาน (${yesterday.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })})`;
    } else if (periodFilter === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      periodLabel = `สัปดาห์นี้ (${weekStart.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })})`;
    } else if (periodFilter === 'last-week') {
      const lastWeekEnd = new Date(now);
      lastWeekEnd.setDate(now.getDate() - now.getDay() - 1);
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
      periodLabel = `สัปดาห์ที่แล้ว (${lastWeekStart.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${lastWeekEnd.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })})`;
    } else if (periodFilter === 'month') {
      periodLabel = `เดือนนี้ (${now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })})`;
    } else if (periodFilter === 'last-month') {
      const lastMonth = new Date(now);
      lastMonth.setMonth(now.getMonth() - 1);
      periodLabel = `เดือนที่แล้ว (${lastMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })})`;
    } else if (periodFilter === 'year') {
      periodLabel = `ปีนี้ (${now.toLocaleDateString('th-TH', { year: 'numeric' })})`;
    } else if (periodFilter === 'last-year') {
      periodLabel = `ปีที่แล้ว (${(now.getFullYear() - 1).toString()})`;
    } else if (periodFilter === 'custom' && customStart && customEnd) {
      const startDate = new Date(customStart);
      const endDate = new Date(customEnd);
      periodLabel = `${startDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
  }
  
  document.getElementById('finance-period-label').textContent = periodLabel;
  
  const orders = filteredOrders;
  const damaged = filteredDamaged;

  let totalRevenue = 0;
  let costOfGoods = 0;
  let shippingCosts = 0;
  let orderValues = [];

  orders.forEach(order => {
    const product = products.find(p => p.sku === order.sku);
    if (product) {
      const orderValue = order.quantity * product.unit_price;
      totalRevenue += orderValue;
      costOfGoods += order.quantity * product.cost_price;
      shippingCosts += order.shipping_cost || 0;
      orderValues.push(orderValue);
    }
  });

  let damagedCosts = 0;
  damaged.forEach(item => {
    const product = products.find(p => p.sku === item.sku);
    if (product) {
      damagedCosts += item.quantity * product.cost_price;
    }
  });

  const totalExpenses = costOfGoods + shippingCosts + damagedCosts;
  const netProfit = totalRevenue - totalExpenses;
  const grossProfit = totalRevenue - costOfGoods;
  const otherExpenses = shippingCosts + damagedCosts;
  
  const grossMargin = totalRevenue > 0 ? ((totalRevenue - costOfGoods) / totalRevenue * 100) : 0;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0;
  const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue * 100) : 0;
  
  const inventoryValue = products.reduce((sum, p) => sum + (p.quantity * p.cost_price), 0);
  const potentialRevenue = products.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0);
  const potentialProfit = potentialRevenue - inventoryValue;
  const totalInventoryItems = products.reduce((sum, p) => sum + p.quantity, 0);
  
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
  const maxOrderValue = orderValues.length > 0 ? Math.max(...orderValues) : 0;
  const minOrderValue = orderValues.length > 0 ? Math.min(...orderValues) : 0;

  // อัพเดทการ์ดหลัก
  document.getElementById('total-revenue').textContent = `฿${totalRevenue.toLocaleString('th-TH', {minimumFractionDigits: 2})}`;
  document.getElementById('total-expenses').textContent = `฿${totalExpenses.toLocaleString('th-TH', {minimumFractionDigits: 2})}`;
  document.getElementById('net-profit').textContent = `฿${netProfit.toLocaleString('th-TH', {minimumFractionDigits: 2})}`;
  
  // อัพเดทสถานะกำไร/ขาดทุน
  const profitIcon = document.getElementById('profit-icon');
  const profitStatus = document.getElementById('profit-status');
  if (netProfit > 0) {
    profitIcon.textContent = '📈';
    profitStatus.textContent = `กำไร ${netMargin.toFixed(1)}%`;
    profitStatus.className = 'text-xs text-green-200';
  } else if (netProfit < 0) {
    profitIcon.textContent = '📉';
    profitStatus.textContent = `ขาดทุน ${Math.abs(netMargin).toFixed(1)}%`;
    profitStatus.className = 'text-xs text-red-200';
  } else {
    profitIcon.textContent = '📊';
    profitStatus.textContent = 'ยังไม่มีข้อมูล';
    profitStatus.className = 'text-xs text-amber-200';
  }

  // อัพเดทรายละเอียดรายรับ
  document.getElementById('sales-revenue').textContent = `฿${totalRevenue.toLocaleString('th-TH', {minimumFractionDigits: 2})}`;
  document.getElementById('total-orders-count').textContent = `${orders.length} ออเดอร์`;
  document.getElementById('avg-order-value').textContent = `฿${avgOrderValue.toLocaleString('th-TH', {minimumFractionDigits: 2})}`;
  document.getElementById('max-order-value').textContent = `฿${maxOrderValue.toLocaleString('th-TH', {minimumFractionDigits: 2})}`;
  document.getElementById('min-order-value').textContent = `฿${minOrderValue.toLocaleString('th-TH', {minimumFractionDigits: 2})}`;

  // อัพเดทรายละเอียดรายจ่าย
  document.getElementById('cost-of-goods').textContent = `฿${costOfGoods.toLocaleString('th-TH', {minimumFractionDigits: 2})}`;
  document.getElementById('shipping-costs').textContent = `฿${shippingCosts.toLocaleString('th-TH', {minimumFractionDigits: 2})}`;
  document.getElementById('damaged-costs').textContent = `฿${damagedCosts.toLocaleString('th-TH', {minimumFractionDigits: 2})}`;
  document.getElementById('damaged-count').textContent = `${damaged.length} รายการ`;
  
  const cogsPercentage = totalRevenue > 0 ? (costOfGoods / totalRevenue * 100).toFixed(1) : 0;
  const shippingPercentage = totalRevenue > 0 ? (shippingCosts / totalRevenue * 100).toFixed(1) : 0;
  document.getElementById('cogs-percentage').textContent = `${cogsPercentage}%`;
  document.getElementById('shipping-percentage').textContent = `${shippingPercentage}%`;

  // อัพเดทกราฟกำไร/ขาดทุน
  document.getElementById('gross-profit-display').textContent = `฿${grossProfit.toLocaleString('th-TH', {minimumFractionDigits: 2})}`;
  document.getElementById('gross-margin-display').textContent = `${grossMargin.toFixed(1)}% margin`;
  document.getElementById('other-expenses-display').textContent = `฿${otherExpenses.toLocaleString('th-TH', {minimumFractionDigits: 2})}`;
  document.getElementById('expense-ratio-display').textContent = `${totalRevenue > 0 ? (otherExpenses / totalRevenue * 100).toFixed(1) : 0}% ของรายรับ`;
  document.getElementById('net-profit-display').textContent = `฿${netProfit.toLocaleString('th-TH', {minimumFractionDigits: 2})}`;
  document.getElementById('net-margin-display').textContent = `${netMargin.toFixed(1)}% margin`;

  // อัพเดทอัตราส่วนทางการเงิน
  document.getElementById('gross-margin').textContent = `${grossMargin.toFixed(1)}%`;
  document.getElementById('net-margin').textContent = `${netMargin.toFixed(1)}%`;
  document.getElementById('expense-ratio').textContent = `${expenseRatio.toFixed(1)}%`;
  
  document.getElementById('gross-margin-bar').style.width = `${Math.min(grossMargin, 100)}%`;
  document.getElementById('net-margin-bar').style.width = `${Math.min(Math.abs(netMargin), 100)}%`;
  document.getElementById('expense-ratio-bar').style.width = `${Math.min(expenseRatio, 100)}%`;

  // อัพเดทสถานะสินค้าคงคลัง
  document.getElementById('inventory-value').textContent = `฿${inventoryValue.toLocaleString('th-TH', {minimumFractionDigits: 2})}`;
  document.getElementById('total-inventory-items').textContent = `${totalInventoryItems.toLocaleString('th-TH')} ชิ้น`;
  document.getElementById('potential-revenue').textContent = `฿${potentialRevenue.toLocaleString('th-TH', {minimumFractionDigits: 2})}`;
  document.getElementById('potential-profit').textContent = `฿${potentialProfit.toLocaleString('th-TH', {minimumFractionDigits: 2})}`;

  // อัพเดทสรุปภาพรวมธุรกิจ
  const businessStatus = document.getElementById('business-status');
  if (netProfit > 0) {
    businessStatus.textContent = '🎉 กำไร';
    businessStatus.className = 'text-2xl font-bold text-green-400';
  } else if (netProfit < 0) {
    businessStatus.textContent = '⚠️ ขาดทุน';
    businessStatus.className = 'text-2xl font-bold text-red-400';
  } else {
    businessStatus.textContent = '➖ คุ้มทุน';
    businessStatus.className = 'text-2xl font-bold text-gray-400';
  }

  const roi = inventoryValue > 0 ? (netProfit / inventoryValue * 100) : 0;
  document.getElementById('roi-display').textContent = `${roi.toFixed(1)}%`;

  const breakeven = totalExpenses;
  document.getElementById('breakeven-display').textContent = `฿${breakeven.toLocaleString('th-TH', {minimumFractionDigits: 0})}`;

  let efficiencyScore = '-';
  if (totalRevenue > 0) {
    const efficiency = (netProfit / totalRevenue) * 100;
    if (efficiency >= 30) efficiencyScore = 'ดีเยี่ยม ⭐⭐⭐';
    else if (efficiency >= 20) efficiencyScore = 'ดีมาก ⭐⭐';
    else if (efficiency >= 10) efficiencyScore = 'ดี ⭐';
    else if (efficiency >= 0) efficiencyScore = 'พอใช้';
    else efficiencyScore = 'ต้องปรับปรุง';
  }
  document.getElementById('efficiency-score').textContent = efficiencyScore;

  // สร้างข้อความวิเคราะห์
  let insight = '';
  if (orders.length === 0) {
    insight = 'เริ่มต้นธุรกิจของคุณโดยการเพิ่มสินค้าและสร้างออเดอร์';
  } else if (netProfit > 0) {
    insight = `ยอดเยี่ยม! ธุรกิจของคุณทำกำไร ฿${netProfit.toLocaleString('th-TH', {minimumFractionDigits: 0})} จากยอดขาย ${orders.length} ออเดอร์ `;
    if (netMargin >= 30) {
      insight += 'อัตรากำไรสูงมาก แสดงว่าคุณบริหารต้นทุนได้ดีเยี่ยม! 🎉';
    } else if (netMargin >= 20) {
      insight += 'อัตรากำไรอยู่ในระดับดี ธุรกิจมีความมั่นคง 👍';
    } else if (netMargin >= 10) {
      insight += 'อัตรากำไรพอใช้ ลองหาวิธีลดต้นทุนเพื่อเพิ่มกำไร';
    } else {
      insight += 'อัตรากำไรค่อนข้างต่ำ ควรทบทวนราคาขายและต้นทุน';
    }
  } else if (netProfit < 0) {
    insight = `⚠️ ธุรกิจขาดทุน ฿${Math.abs(netProfit).toLocaleString('th-TH', {minimumFractionDigits: 0})} `;
    if (costOfGoods > totalRevenue * 0.7) {
      insight += 'ต้นทุนสินค้าสูงเกินไป ควรหาซัพพลายเออร์ที่ราคาดีกว่า หรือปรับราคาขาย';
    } else if (damagedCosts > totalRevenue * 0.1) {
      insight += 'สินค้าชำรุดมากเกินไป ควรปรับปรุงการจัดเก็บและขนส่ง';
    } else {
      insight += 'ควรเพิ่มยอดขายและลดค่าใช้จ่ายเพื่อให้กลับมาทำกำไร';
    }
  } else {
    insight = 'ธุรกิจอยู่ในจุดคุ้มทุน รายรับเท่ากับรายจ่ายพอดี';
  }
  document.getElementById('business-insight').textContent = insight;

  // วาดกราฟ
  drawProfitChart(totalRevenue, costOfGoods, otherExpenses, netProfit);
}

function drawProfitChart(revenue, cogs, otherExpenses, netProfit) {
  const canvas = document.getElementById('profit-chart');
  if (!canvas || typeof canvas.getContext !== 'function') {
    return;
  }
  const ctx = canvas.getContext('2d');
 
  canvas.width = canvas.offsetWidth;
  canvas.height = 300;
  
  const width = canvas.width;
  const height = canvas.height;
  // ใช้ค่า fallback หากมีค่าไม่ใช่ตัวเลขหรืออินฟินิตี้
  const values = [revenue, cogs, otherExpenses, netProfit].map(value =>
    Number.isFinite(value) ? value : 0
  );

  [revenue, cogs, otherExpenses, netProfit] = values;

  const padding = 60;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  ctx.clearRect(0, 0, width, height);

  const maxValueBase = Math.max(
    Math.abs(revenue),
    Math.abs(cogs + otherExpenses),
    Math.abs(netProfit)
  );
  const maxValue = Math.max(maxValueBase * 1.2, 1); // ป้องกันหารด้วยศูนย์

  // วาดแกน
  ctx.strokeStyle = '#4b5563';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();
  
  // วาดเส้นกริด
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padding + (chartHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    
    const value = maxValue * (1 - i / 5);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`฿${(value / 1000).toFixed(0)}K`, padding - 10, y + 4);
  }
  
  const barWidth = chartWidth / 5;
  const barSpacing = barWidth / 4;
  
  // ฟังก์ชันวาดแท่ง
  function drawBar(x, value, color, label) {
    const safeValue = Number.isFinite(value) ? value : 0;
    const barHeight = maxValue > 0 ? (Math.abs(safeValue) / maxValue) * chartHeight : 0;
    const barY = safeValue >= 0 ? height - padding - barHeight : height - padding;

    const gradientHeight = Math.max(barHeight, 1);
    const gradient = ctx.createLinearGradient(0, barY, 0, barY + gradientHeight);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color + '80');

    ctx.fillStyle = gradient;
    ctx.fillRect(x, barY, barWidth - barSpacing, barHeight);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, barY, barWidth - barSpacing, barHeight);
    
    ctx.fillStyle = '#f3f4f6';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + (barWidth - barSpacing) / 2, height - padding + 25);
    
    ctx.fillStyle = color;
    ctx.font = 'bold 12px sans-serif';
    const valueText = `฿${(Math.abs(safeValue) / 1000).toFixed(1)}K`;
    ctx.fillText(valueText, x + (barWidth - barSpacing) / 2, barY - 10);
  }
  
  // วาดแท่งกราฟ
  drawBar(padding + barWidth * 0.5, revenue, '#10b981', 'รายรับ');
  drawBar(padding + barWidth * 1.5, cogs, '#ef4444', 'ต้นทุน');
  drawBar(padding + barWidth * 2.5, otherExpenses, '#f97316', 'ค่าใช้จ่าย');
  drawBar(padding + barWidth * 3.5, netProfit, netProfit >= 0 ? '#f59e0b' : '#dc2626', netProfit >= 0 ? 'กำไร' : 'ขาดทุน');
  
  // วาดเส้นแบ่งที่ 0
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();
  ctx.setLineDash([]);
}

function updateProductSelects() {
  const products = allData.filter(item => item.type === 'product');
  const damagedSelect = document.getElementById('damaged-product');
  const orderSelect = document.getElementById('order-product');
  const addStockSelect = document.getElementById('add-stock-product');

  if (!damagedSelect || !orderSelect || !addStockSelect) {
    return;
  }

  const options = products.map(p => `<option value="${p.sku}">${p.product_name} (${p.sku})</option>`).join('');
  
  damagedSelect.innerHTML = '<option value="">เลือกสินค้า</option>' + options;
  orderSelect.innerHTML = '<option value="">เลือกสินค้า</option>' + options;
  addStockSelect.innerHTML = '<option value="">เลือกสินค้า</option>' + options;
}

function getCustomers() {
  return allData.filter(item => item.type === 'customer');
}

function getCustomerIdentifier(customer) {
  if (!customer) return '';
  return customer.customer_id || customer.__backendId || '';
}

function findCustomerById(customerId) {
  if (!customerId) return null;
  return allData.find(item =>
    item.type === 'customer' &&
    (item.customer_id === customerId || item.__backendId === customerId)
  ) || null;
}

function getOrdersForCustomer(customer) {
  if (!customer) return [];
  const identifier = getCustomerIdentifier(customer);
  const name = customer.name ? customer.name.toLowerCase() : '';
  return allData.filter(item => item.type === 'order').filter(order => {
    if (identifier && order.customer_id) {
      return order.customer_id === identifier;
    }
    if (!identifier && name && order.customer_name) {
      return order.customer_name.toLowerCase() === name;
    }
    if (!order.customer_id && identifier && order.customer_name && name) {
      return order.customer_name.toLowerCase() === name;
    }
    return false;
  });
}

function updateCustomerSelectOptions() {
  const select = document.getElementById('order-customer-select');
  if (!select) return;
  const previousValue = select.value;
  const customers = getCustomers().slice().sort((a, b) => {
    const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
    const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
    return bTime - aTime;
  });
  const options = ['<option value="">พิมพ์ข้อมูลเอง</option>'];
  customers.forEach(customer => {
    const id = getCustomerIdentifier(customer);
    const parts = [customer.name || 'ไม่ระบุชื่อ'];
    if (customer.phone) {
      parts.push(customer.phone);
    }
    options.push(`<option value="${id}">${parts.join(' • ')}</option>`);
  });
  select.innerHTML = options.join('');
  if (previousValue && customers.some(c => getCustomerIdentifier(c) === previousValue)) {
    select.value = previousValue;
  }
}

function renderCustomerList() {
  const tbody = document.getElementById('customers-list');
  if (!tbody) return;
  const searchTerm = (document.getElementById('customer-search')?.value || '').toLowerCase();
  const customers = getCustomers().filter(customer => {
    const target = `${customer.name || ''} ${customer.phone || ''} ${customer.note || ''}`.toLowerCase();
    return target.includes(searchTerm);
  }).sort((a, b) => {
    const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
    const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
    return bTime - aTime;
  });
  const countEl = document.getElementById('customer-count');
  if (countEl) {
    countEl.textContent = customers.length;
  }
  if (!customers.length) {
    tbody.innerHTML = `<tr>
      <td colspan="5" class="py-4 px-3 text-center text-gray-400">ยังไม่มีข้อมูลลูกค้าที่บันทึกไว้</td>
    </tr>`;
    return;
  }
  tbody.innerHTML = customers.map(customer => {
    const orders = getOrdersForCustomer(customer).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const orderCount = orders.length;
    const lastOrder = orders[0];
    const lastOrderText = lastOrder ? new Date(lastOrder.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
    const contactText = [customer.phone, customer.note].filter(Boolean).join(' • ') || '-';
    const id = getCustomerIdentifier(customer);
    return `
      <tr class="border-b border-gray-700 hover:bg-gray-700 transition-colors">
        <td class="py-3 px-3 font-semibold text-gray-100">${customer.name || 'ไม่ระบุชื่อ'}</td>
        <td class="py-3 px-3 text-gray-300">${contactText}</td>
        <td class="py-3 px-3 font-semibold text-right">${orderCount}</td>
        <td class="py-3 px-3 text-sm text-gray-400">${lastOrderText}</td>
        <td class="py-3 px-3">
          <div class="flex items-center justify-center gap-2">
            <button data-customer="${id}" onclick="viewCustomerHistory(this.dataset.customer)" class="text-green-400 hover:text-green-300 text-sm font-medium transition-colors">ดู</button>
            <button data-customer="${id}" onclick="editCustomerRecord(this.dataset.customer)" class="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">แก้ไข</button>
            <button data-customer="${id}" onclick="deleteCustomerRecord(this.dataset.customer)" class="text-red-400 hover:text-red-300 text-sm font-medium transition-colors">ลบ</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderCustomerOrders(customerId) {
  const wrapper = document.getElementById('customer-orders-wrapper');
  const emptyState = document.getElementById('customer-history-empty');
  const summary = document.getElementById('customer-orders-summary');
  const activeName = document.getElementById('customer-active-name');
  const list = document.getElementById('customer-orders-list');
  if (!wrapper || !emptyState || !summary || !list) return;
  if (!customerId) {
    activeCustomerHistoryId = null;
    wrapper.classList.add('hidden');
    emptyState.classList.remove('hidden');
    emptyState.textContent = 'ยังไม่ได้เลือกลูกค้า';
    summary.textContent = 'เลือกลูกค้าเพื่อดูรายการออเดอร์ที่เกี่ยวข้อง';
    if (activeName) {
      activeName.classList.add('hidden');
    }
    return;
  }
  const customer = findCustomerById(customerId);
  if (!customer) {
    renderCustomerOrders(null);
    return;
  }
  activeCustomerHistoryId = getCustomerIdentifier(customer);
  const orders = getOrdersForCustomer(customer).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (!orders.length) {
    wrapper.classList.add('hidden');
    emptyState.classList.remove('hidden');
    emptyState.textContent = 'ยังไม่มีออเดอร์สำหรับลูกค้ารายนี้';
    summary.textContent = `ยังไม่มีออเดอร์ของ ${customer.name || 'ลูกค้าไม่ทราบชื่อ'}`;
    if (activeName) {
      activeName.textContent = customer.name || '';
      activeName.classList.remove('hidden');
    }
    return;
  }
  wrapper.classList.remove('hidden');
  emptyState.classList.add('hidden');
  const totalRevenue = orders.reduce((sum, order) => {
    const product = allData.find(item => item.type === 'product' && item.sku === order.sku);
    if (product) {
      return sum + (order.quantity * product.unit_price);
    }
    return sum;
  }, 0);
  summary.textContent = `พบ ${orders.length} ออเดอร์ • ยอดขายรวม ฿${totalRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
  if (activeName) {
    activeName.textContent = customer.name || '';
    activeName.classList.remove('hidden');
  }
  list.innerHTML = orders.map(order => {
    const product = allData.find(item => item.type === 'product' && item.sku === order.sku);
    const revenue = product ? order.quantity * product.unit_price : 0;
    const orderDate = new Date(order.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
    return `
      <tr class="border-b border-gray-700 hover:bg-gray-700 transition-colors">
        <td class="py-3 px-3">${orderDate}</td>
        <td class="py-3 px-3 font-mono text-amber-300">${order.order_id}</td>
        <td class="py-3 px-3">${order.product_name || '-'}</td>
        <td class="py-3 px-3 text-right font-semibold">${order.quantity}</td>
        <td class="py-3 px-3 text-right text-green-400">฿${revenue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
        <td class="py-3 px-3 text-sm">${order.status || '-'}</td>
      </tr>
    `;
  }).join('');
}

function updateCustomerUI() {
  updateCustomerSelectOptions();
  renderCustomerList();
  if (activeCustomerHistoryId) {
    renderCustomerOrders(activeCustomerHistoryId);
  }
}

async function persistCustomerRecord(customerRecord, isUpdate = false) {
  const canCreate = typeof window !== 'undefined' && window.dataSdk && typeof window.dataSdk.create === 'function';
  const canUpdate = typeof window !== 'undefined' && window.dataSdk && typeof window.dataSdk.update === 'function';
  try {
    if (isUpdate) {
      customerRecord.updated_at = new Date().toISOString();
      if (canUpdate && customerRecord.__backendId) {
        const result = await window.dataSdk.update(customerRecord);
        if (!result.isOk) {
          throw new Error('update failed');
        }
      } else if (!canCreate) {
        const index = allData.findIndex(item => item.type === 'customer' && getCustomerIdentifier(item) === getCustomerIdentifier(customerRecord));
        if (index === -1) {
          allData.push(customerRecord);
        }
      }
    } else {
      customerRecord.created_at = customerRecord.created_at || new Date().toISOString();
      customerRecord.updated_at = customerRecord.updated_at || customerRecord.created_at;
      if (canCreate) {
        const result = await window.dataSdk.create(customerRecord);
        if (!result.isOk) {
          throw new Error('create failed');
        }
      } else {
        customerRecord.__backendId = customerRecord.__backendId || `customer-offline-${Date.now()}`;
        allData.push(customerRecord);
      }
    }
    if (!canCreate || !canUpdate) {
      if (typeof updateAllViews === 'function') {
        updateAllViews();
      }
    }
    return true;
  } catch (error) {
    console.error('persistCustomerRecord failed', error);
    return false;
  }
}

async function saveCustomerFromOrder(info) {
  const now = new Date().toISOString();
  if (info.existingId) {
    const existing = findCustomerById(info.existingId);
    if (existing) {
      existing.name = info.name || existing.name;
      existing.phone = info.phone || existing.phone || '';
      existing.address = info.address || existing.address || '';
      existing.note = info.note || existing.note || '';
      existing.updated_at = now;
      const updated = await persistCustomerRecord(existing, true);
      if (!updated) {
        showToast('ไม่สามารถอัปเดตข้อมูลลูกค้าได้', 'warning');
      }
      return getCustomerIdentifier(existing);
    }
  }
  const newCustomer = {
    type: 'customer',
    customer_id: generateCustomerId(),
    name: info.name || '',
    phone: info.phone || '',
    address: info.address || '',
    note: info.note || '',
    created_at: now,
    updated_at: now
  };
  const created = await persistCustomerRecord(newCustomer, false);
  if (!created && (!window.dataSdk || typeof window.dataSdk.create !== 'function')) {
    newCustomer.__backendId = newCustomer.__backendId || `customer-offline-${Date.now()}`;
    allData.push(newCustomer);
    if (typeof updateAllViews === 'function') {
      updateAllViews();
    }
  }
  return getCustomerIdentifier(newCustomer);
}

function populateCustomerForm(customer) {
  const title = document.getElementById('customer-form-title');
  const saveBtn = document.getElementById('customer-save-btn');
  const cancelBtn = document.getElementById('cancel-customer-edit-btn');
  if (!customer) return;
  document.getElementById('customer-name').value = customer.name || '';
  document.getElementById('customer-phone').value = customer.phone || '';
  document.getElementById('customer-address').value = customer.address || '';
  document.getElementById('customer-note').value = customer.note || '';
  document.getElementById('customer-edit-id').value = getCustomerIdentifier(customer);
  if (title) {
    title.textContent = '✏️ แก้ไขลูกค้า';
  }
  if (saveBtn) {
    saveBtn.textContent = '💾 บันทึกการแก้ไข';
  }
  if (cancelBtn) {
    cancelBtn.classList.remove('hidden');
  }
}

function resetCustomerForm() {
  const form = document.getElementById('customer-form');
  if (!form) return;
  form.reset();
  document.getElementById('customer-edit-id').value = '';
  const title = document.getElementById('customer-form-title');
  if (title) {
    title.textContent = 'เพิ่ม / แก้ไขลูกค้า';
  }
  const saveBtn = document.getElementById('customer-save-btn');
  if (saveBtn) {
    saveBtn.textContent = '+ บันทึกลูกค้า';
  }
  const cancelBtn = document.getElementById('cancel-customer-edit-btn');
  if (cancelBtn) {
    cancelBtn.classList.add('hidden');
  }
}

async function editCustomerRecord(customerId) {
  const customer = findCustomerById(customerId);
  if (!customer) return;
  populateCustomerForm(customer);
  const tabBtn = document.querySelector('[data-tab="customers"]');
  if (tabBtn) {
    tabBtn.click();
  }
  document.getElementById('customer-name')?.focus();
}

async function deleteCustomerRecord(customerId) {
  const customer = findCustomerById(customerId);
  if (!customer) return;
  const confirmDelete = window.confirm(`ต้องการลบลูกค้า ${customer.name || ''} หรือไม่?`);
  if (!confirmDelete) return;
  const canDelete = typeof window !== 'undefined' && window.dataSdk && typeof window.dataSdk.delete === 'function';
  let result = { isOk: true };
  let removedLocally = false;
  if (canDelete && customer.__backendId) {
    try {
      result = await window.dataSdk.delete(customer);
    } catch (error) {
      console.error('delete customer failed', error);
      result = { isOk: false };
    }
  } else {
    const index = allData.indexOf(customer);
    if (index !== -1) {
      allData.splice(index, 1);
      removedLocally = true;
    }
    if (typeof updateAllViews === 'function') {
      updateAllViews();
    }
  }
  if (result.isOk) {
    if (canDelete && !removedLocally) {
      const index = allData.indexOf(customer);
      if (index !== -1) {
        allData.splice(index, 1);
        removedLocally = true;
      }
    }
    if (removedLocally) {
      updateCustomerUI();
    }
    showToast('ลบลูกค้าสำเร็จ', 'success');
    if (activeCustomerHistoryId === getCustomerIdentifier(customer)) {
      renderCustomerOrders(null);
    }
  } else {
    showToast('ไม่สามารถลบลูกค้าได้', 'error');
  }
}

function viewCustomerHistory(customerId) {
  const tabBtn = document.querySelector('[data-tab="customers"]');
  if (tabBtn) {
    tabBtn.click();
  }
  renderCustomerOrders(customerId);
}

function updateHistory() {
  const history = allData.filter(item => item.type === 'history' || item.type === 'stock_history');
  
  // กรองตามเงื่อนไข
  const searchTerm = document.getElementById('search-history')?.value.toLowerCase() || '';
  const categoryFilter = document.getElementById('filter-history-category')?.value || '';
  const timeFilter = document.getElementById('filter-history-time')?.value || '';
  
  let filteredHistory = history.filter(item => {
    // ค้นหา
    const matchSearch = !searchTerm || 
      item.product_name.toLowerCase().includes(searchTerm) ||
      item.sku.toLowerCase().includes(searchTerm);
    
    // หมวดหมู่
    const matchCategory = !categoryFilter || item.category === categoryFilter;
    
    // ช่วงเวลา
    let matchTime = true;
    if (timeFilter) {
      const itemDate = new Date(item.created_at);
      const now = new Date();
      const diffDays = Math.floor((now - itemDate) / (1000 * 60 * 60 * 24));
      
      if (timeFilter === 'today') {
        matchTime = diffDays === 0;
      } else if (timeFilter === 'week') {
        matchTime = diffDays <= 7;
      } else if (timeFilter === 'month') {
        matchTime = diffDays <= 30;
      }
    }
    
    return matchSearch && matchCategory && matchTime;
  });
  
  // เรียงตามวันที่ล่าสุด
  filteredHistory.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  const tbody = document.getElementById('history-list');
  document.getElementById('history-count').textContent = filteredHistory.length;
  
  if (filteredHistory.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center py-8 text-gray-400">ไม่พบประวัติที่ตรงกับเงื่อนไข</td></tr>';
  } else {
    tbody.innerHTML = filteredHistory.map(item => {
      const date = new Date(item.created_at);
      const dateStr = date.toLocaleDateString('th-TH', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      const timeStr = date.toLocaleTimeString('th-TH', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      const brandModel = [
        item.brand || '',
        item.model || ''
      ].filter(x => x).join(' - ') || '-';
      
      // แยกประเภทและจำนวน
      let historyType = '';
      let quantity = 0;
      let quantityDisplay = '';
      let totalValue = 0;
      
      if (item.type === 'history') {
        historyType = '📦 เพิ่มสินค้าใหม่';
        quantity = item.initial_quantity;
        quantityDisplay = `${quantity} ${item.unit || 'ชิ้น'}`;
        totalValue = quantity * item.cost_price;
      } else if (item.type === 'stock_history') {
        historyType = '➕ เพิ่มสต๊อก';
        quantity = item.quantity_added;
        quantityDisplay = `+${quantity} ${item.unit || 'ชิ้น'} (${item.old_quantity} → ${item.new_quantity})`;
        totalValue = quantity * item.cost_price;
      }
      
      return `
        <tr class="border-b border-gray-700 hover:bg-gray-700 transition-colors">
          <td class="py-3 px-2">
            <div class="text-gray-300">${dateStr}</div>
            <div class="text-xs text-gray-500">${timeStr}</div>
          </td>
          <td class="py-3 px-2">
            <span class="inline-block px-2 py-1 text-xs rounded ${item.type === 'history' ? 'bg-blue-600' : 'bg-green-600'}">${historyType}</span>
          </td>
          <td class="py-3 px-2 font-mono text-amber-400">${item.sku}</td>
          <td class="py-3 px-2 font-medium">${item.product_name}</td>
          <td class="py-3 px-2 text-gray-400 text-sm">${brandModel}</td>
          <td class="py-3 px-2">
            <span class="inline-block px-2 py-1 text-xs rounded-full bg-gray-700">${item.category}</span>
          </td>
          <td class="py-3 px-2 text-right font-semibold text-green-400">${quantityDisplay}</td>
          <td class="py-3 px-2 text-right text-gray-400">฿${item.cost_price.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
          <td class="py-3 px-2 text-right font-semibold">฿${item.unit_price.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
          <td class="py-3 px-2 text-right font-semibold text-blue-400">฿${totalValue.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
        </tr>
      `;
    }).join('');
  }
  
  // สรุปประวัติ
  const totalItems = filteredHistory.length;
  const totalQuantity = filteredHistory.reduce((sum, item) => {
    if (item.type === 'history') {
      return sum + item.initial_quantity;
    } else if (item.type === 'stock_history') {
      return sum + item.quantity_added;
    }
    return sum;
  }, 0);
  const totalValue = filteredHistory.reduce((sum, item) => {
    if (item.type === 'history') {
      return sum + (item.initial_quantity * item.cost_price);
    } else if (item.type === 'stock_history') {
      return sum + (item.quantity_added * item.cost_price);
    }
    return sum;
  }, 0);
  
  document.getElementById('history-total-items').textContent = `${totalItems} รายการ`;
  document.getElementById('history-total-quantity').textContent = `${totalQuantity.toLocaleString('th-TH')} ชิ้น`;
  document.getElementById('history-total-value').textContent = `฿${totalValue.toLocaleString('th-TH', {minimumFractionDigits: 2})}`;
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    if (!currentUser) {
      showToast('กรุณาเข้าสู่ระบบก่อนใช้งาน', 'warning');
      return;
    }
    if (!canAccessTab(tabName)) {
      showToast('คุณไม่มีสิทธิ์เข้าถึงเมนูนี้', 'warning');
      return;
    }
    activateTab(tabName);
  });
});

function editProduct(backendId) {
  const product = allData.find(p => p.__backendId === backendId);
  if (!product) return;

  document.getElementById('product-edit-id').value = backendId;
  document.getElementById('product-name').value = product.product_name;
  document.getElementById('product-category').value = product.category;
  document.getElementById('product-brand').value = product.brand || '';
  document.getElementById('product-model').value = product.model || '';
  document.getElementById('product-color').value = product.color || '';
  document.getElementById('product-size').value = product.size || '';
  document.getElementById('product-year').value = product.year || '';
  document.getElementById('product-sku').value = product.sku;
  document.getElementById('product-barcode').value = product.barcode || '';
  document.getElementById('product-supplier').value = product.supplier || '';
  document.getElementById('product-description').value = product.description || '';
  document.getElementById('product-quantity').value = product.quantity;
  document.getElementById('product-unit').value = product.unit || 'ชิ้น';
  document.getElementById('product-min-stock').value = product.min_stock || '';
  document.getElementById('product-max-stock').value = product.max_stock || '';
  document.getElementById('product-weight').value = product.weight || '';
  document.getElementById('product-dimensions').value = product.dimensions || '';
  document.getElementById('product-cost').value = product.cost_price;
  document.getElementById('product-wholesale').value = product.wholesale_price || '';
  document.getElementById('product-price').value = product.unit_price;
  document.getElementById('product-location').value = product.location || '';
  document.getElementById('product-expiry').value = product.expiry_date || '';
  document.getElementById('product-warranty').value = product.warranty_months || 0;

  document.getElementById('product-form-title').textContent = '✏️ แก้ไขสินค้า';
  document.getElementById('add-product-btn').textContent = '💾 บันทึกการแก้ไข';
  document.getElementById('cancel-edit-btn').classList.remove('hidden');

  const container = document.getElementById('product-form-container');
  const icon = document.getElementById('form-toggle-icon');
  container.style.display = 'block';
  icon.textContent = '▼';
  icon.style.transform = 'rotate(0deg)';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('cancel-edit-btn').addEventListener('click', () => {
  document.getElementById('product-form').reset();
  document.getElementById('product-edit-id').value = '';
  document.getElementById('product-form-title').textContent = '📦 เพิ่มสินค้าใหม่';
  document.getElementById('add-product-btn').textContent = '✓ เพิ่มสินค้า';
  document.getElementById('cancel-edit-btn').classList.add('hidden');
});

function editDamaged(backendId) {
  const damaged = allData.find(d => d.__backendId === backendId);
  if (!damaged) return;

  document.getElementById('damaged-edit-id').value = backendId;
  document.getElementById('damaged-product').value = damaged.sku;
  document.getElementById('damaged-quantity').value = damaged.quantity;
  document.getElementById('damaged-reason').value = damaged.damage_reason;

  document.getElementById('damaged-form-title').textContent = '✏️ แก้ไขสินค้าชำรุด';
  document.getElementById('add-damaged-btn').textContent = '💾 บันทึกการแก้ไข';
  document.getElementById('cancel-damaged-edit-btn').classList.remove('hidden');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('cancel-damaged-edit-btn').addEventListener('click', () => {
  document.getElementById('damaged-form').reset();
  document.getElementById('damaged-edit-id').value = '';
  document.getElementById('damaged-form-title').textContent = 'บันทึกสินค้าชำรุด';
  document.getElementById('add-damaged-btn').textContent = 'บันทึกสินค้าชำรุด';
  document.getElementById('cancel-damaged-edit-btn').classList.add('hidden');
});

document.getElementById('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('add-product-btn');
  const editId = document.getElementById('product-edit-id').value;
  const sdkAvailable = typeof window !== 'undefined' && window.dataSdk && typeof window.dataSdk.create === 'function';
  const idleText = editId ? '💾 บันทึกการแก้ไข' : '✓ เพิ่มสินค้า';

  const setButtonState = (text, disabled) => {
    btn.textContent = text;
    btn.disabled = disabled;
  };

  if (!editId && allData.length >= 999) {
    showToast('ถึงขีดจำกัด 999 รายการแล้ว กรุณาลบรายการเก่าก่อน', 'error');
    setButtonState(idleText, false);
    return;
  }

  setButtonState(editId ? '⏳ กำลังบันทึก...' : '⏳ กำลังเพิ่ม...', true);

  const yearValue = document.getElementById('product-year').value;
  const minStockValue = document.getElementById('product-min-stock').value;
  const maxStockValue = document.getElementById('product-max-stock').value;
  const weightValue = document.getElementById('product-weight').value;
  const wholesaleValue = document.getElementById('product-wholesale').value;
  const warrantyValue = document.getElementById('product-warranty').value;

  const productData = {
    type: 'product',
    product_name: document.getElementById('product-name').value || '',
    category: document.getElementById('product-category').value || '',
    brand: document.getElementById('product-brand').value || '',
    model: document.getElementById('product-model').value || '',
    color: document.getElementById('product-color').value || '',
    size: document.getElementById('product-size').value || '',
    year: yearValue ? parseInt(yearValue) : 0,
    sku: document.getElementById('product-sku').value || '',
    barcode: document.getElementById('product-barcode').value || '',
    supplier: document.getElementById('product-supplier').value || '',
    description: document.getElementById('product-description').value || '',
    quantity: parseInt(document.getElementById('product-quantity').value) || 0,
    unit: document.getElementById('product-unit').value || 'ชิ้น',
    min_stock: minStockValue ? parseInt(minStockValue) : 0,
    max_stock: maxStockValue ? parseInt(maxStockValue) : 0,
    weight: weightValue ? parseFloat(weightValue) : 0,
    dimensions: document.getElementById('product-dimensions').value || '',
    cost_price: parseFloat(document.getElementById('product-cost').value) || 0,
    wholesale_price: wholesaleValue ? parseFloat(wholesaleValue) : 0,
    unit_price: parseFloat(document.getElementById('product-price').value) || 0,
    location: document.getElementById('product-location').value || '',
    expiry_date: document.getElementById('product-expiry').value || '',
    warranty_months: warrantyValue ? parseInt(warrantyValue) : 0,
    updated_at: new Date().toISOString()
  };

  try {
    if (editId) {
      const product = allData.find(p => p.__backendId === editId);
      if (product) {
        Object.assign(product, productData);
        let result = { isOk: true };
        if (sdkAvailable) {
          try {
            result = await window.dataSdk.update(product);
          } catch (error) {
            console.error('update product failed', error);
            result = { isOk: false };
          }
        }

        if (result.isOk) {
          showToast('✓ แก้ไขสินค้าสำเร็จ', 'success');
          document.getElementById('product-form').reset();
          document.getElementById('product-edit-id').value = '';
          document.getElementById('product-form-title').textContent = '📦 เพิ่มสินค้าใหม่';
          document.getElementById('cancel-edit-btn').classList.add('hidden');

          const container = document.getElementById('product-form-container');
          const icon = document.getElementById('form-toggle-icon');
          container.style.display = 'none';
          icon.textContent = '▶';
          icon.style.transform = 'rotate(-90deg)';

          if (!sdkAvailable && typeof updateAllViews === 'function') {
            updateAllViews();
          }
          await pushProductToGoogleSheet(product);
        } else {
          showToast('✕ เกิดข้อผิดพลาดในการแก้ไขสินค้า', 'error');
        }
      }
    } else {
      productData.created_at = new Date().toISOString();
      let result = { isOk: true };
      if (sdkAvailable) {
        try {
          result = await window.dataSdk.create(productData);
        } catch (error) {
          console.error('create product failed', error);
          result = { isOk: false };
        }
      } else {
        productData.__backendId = `offline-${Date.now()}`;
        allData.push(productData);
      }

      const pushOfflineRecord = () => {
        const existingProduct = allData.find(p => p.type === 'product' && p.sku === productData.sku);
        if (!existingProduct) {
          productData.__backendId = productData.__backendId || `offline-${Date.now()}`;
          allData.push(productData);
        }
        const historyData = {
          type: 'history',
          product_name: productData.product_name,
          category: productData.category,
          brand: productData.brand,
          model: productData.model,
          sku: productData.sku,
          initial_quantity: productData.quantity,
          unit: productData.unit,
          cost_price: productData.cost_price,
          unit_price: productData.unit_price,
          created_at: productData.created_at,
          __backendId: `history-${Date.now()}`
        };
        allData.push(historyData);
        if (typeof updateAllViews === 'function') {
          updateAllViews();
        }
      };

      if (result.isOk) {
        const historyData = {
          type: 'history',
          product_name: productData.product_name,
          category: productData.category,
          brand: productData.brand,
          model: productData.model,
          sku: productData.sku,
          initial_quantity: productData.quantity,
          unit: productData.unit,
          cost_price: productData.cost_price,
          unit_price: productData.unit_price,
          created_at: productData.created_at
        };

        if (sdkAvailable) {
          try {
            await window.dataSdk.create(historyData);
          } catch (error) {
            console.error('create history failed', error);
          }
        } else {
          historyData.__backendId = `history-${Date.now()}`;
          allData.push(historyData);
        }

        if (!sdkAvailable && typeof updateAllViews === 'function') {
          updateAllViews();
        }

        showToast('✓ เพิ่มสินค้าสำเร็จ', 'success');
        e.target.reset();

        const container = document.getElementById('product-form-container');
        const icon = document.getElementById('form-toggle-icon');
        container.style.display = 'none';
        icon.textContent = '▶';
        icon.style.transform = 'rotate(-90deg)';
        await pushProductToGoogleSheet(productData);
      } else {
        console.warn('window.dataSdk.create failed, using offline fallback');
        pushOfflineRecord();
        showToast('✓ เพิ่มสินค้าแบบออฟไลน์ (ยังไม่ส่งข้อมูล)', 'warning');
        e.target.reset();
        const container = document.getElementById('product-form-container');
        const icon = document.getElementById('form-toggle-icon');
        container.style.display = 'none';
        icon.textContent = '▶';
        icon.style.transform = 'rotate(-90deg)';
      }

      await pushProductToGoogleSheet(productData);
    }
  } catch (error) {
    console.error('Unexpected error in product form', error);
    showToast('✕ เกิดข้อผิดพลาดในการบันทึกสินค้า', 'error');
  } finally {
    setButtonState(idleText, false);
  }
});

document.getElementById('damaged-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const editId = document.getElementById('damaged-edit-id').value;
  const btn = document.getElementById('add-damaged-btn');
  
  if (!editId && allData.length >= 999) {
    showToast('ถึงขีดจำกัด 999 รายการแล้ว กรุณาลบรายการเก่าก่อน', 'error');
    return;
  }

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = editId ? '⏳ กำลังบันทึก...' : '⏳ กำลังบันทึก...';

  const sku = document.getElementById('damaged-product').value;
  const quantity = parseInt(document.getElementById('damaged-quantity').value);
  const product = allData.find(p => p.type === 'product' && p.sku === sku);

  if (!product) {
    btn.disabled = false;
    btn.textContent = originalText;
    showToast('✕ ไม่พบสินค้า', 'error');
    return;
  }

  if (editId) {
    const damaged = allData.find(d => d.__backendId === editId);
    if (damaged) {
      const oldQuantity = damaged.quantity;
      const oldSku = damaged.sku;
      
      if (oldSku !== sku) {
        const oldProduct = allData.find(p => p.type === 'product' && p.sku === oldSku);
        if (oldProduct) {
          oldProduct.quantity += oldQuantity;
          oldProduct.updated_at = new Date().toISOString();
          await window.dataSdk.update(oldProduct);
        }
        
        if (quantity > product.quantity) {
          btn.disabled = false;
          btn.textContent = originalText;
          showToast('✕ สต๊อกสินค้าไม่เพียงพอ', 'error');
          return;
        }
        
        product.quantity -= quantity;
        product.updated_at = new Date().toISOString();
        await window.dataSdk.update(product);
      } else {
        const stockDiff = quantity - oldQuantity;
        if (stockDiff > product.quantity) {
          btn.disabled = false;
          btn.textContent = originalText;
          showToast('✕ สต๊อกสินค้าไม่เพียงพอ', 'error');
          return;
        }
        
        product.quantity -= stockDiff;
        product.updated_at = new Date().toISOString();
        await window.dataSdk.update(product);
      }

      damaged.product_name = product.product_name;
      damaged.sku = sku;
      damaged.quantity = quantity;
      damaged.damage_reason = document.getElementById('damaged-reason').value;
      damaged.updated_at = new Date().toISOString();

      const result = await window.dataSdk.update(damaged);
      
      if (result.isOk) {
        showToast('✓ แก้ไขสินค้าชำรุดสำเร็จ', 'success');
        document.getElementById('damaged-form').reset();
        document.getElementById('damaged-edit-id').value = '';
        document.getElementById('damaged-form-title').textContent = 'บันทึกสินค้าชำรุด';
        document.getElementById('add-damaged-btn').textContent = 'บันทึกสินค้าชำรุด';
        document.getElementById('cancel-damaged-edit-btn').classList.add('hidden');
      } else {
        showToast('✕ เกิดข้อผิดพลาดในการแก้ไขสินค้าชำรุด', 'error');
      }
    }
  } else {
    if (quantity > product.quantity) {
      btn.disabled = false;
      btn.textContent = originalText;
      showToast('✕ จำนวนสินค้าชำรุดมากกว่าสต๊อกที่มี', 'error');
      return;
    }

    const damagedData = {
      type: 'damaged',
      product_name: product.product_name,
      sku: sku,
      quantity: quantity,
      damage_reason: document.getElementById('damaged-reason').value,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const createResult = await window.dataSdk.create(damagedData);
    
    if (createResult.isOk) {
      product.quantity -= quantity;
      product.updated_at = new Date().toISOString();
      const updateResult = await window.dataSdk.update(product);
      
      if (updateResult.isOk) {
        showToast('✓ บันทึกสินค้าชำรุดสำเร็จ', 'success');
        e.target.reset();
      } else {
        showToast('⚠️ บันทึกสำเร็จ แต่ไม่สามารถอัพเดทสต๊อกได้', 'warning');
      }
    } else {
      showToast('✕ เกิดข้อผิดพลาดในการบันทึกสินค้าชำรุด', 'error');
    }
  }

  btn.disabled = false;
  btn.textContent = originalText;
});

function editOrder(backendId) {
  const order = allData.find(o => o.__backendId === backendId);
  if (!order) return;

  document.getElementById('order-edit-id').value = backendId;
  document.getElementById('order-id').value = order.order_id;
  document.getElementById('order-customer').value = order.customer_name;
  updateCustomerSelectOptions();
  const savedCustomerSelect = document.getElementById('order-customer-select');
  if (savedCustomerSelect) {
    savedCustomerSelect.value = order.customer_id || '';
  }
  document.getElementById('order-customer-phone').value = order.customer_phone || '';
  document.getElementById('order-save-customer').checked = false;
  document.getElementById('order-product').value = order.sku;
  document.getElementById('order-quantity').value = order.quantity;
  document.getElementById('order-shipping').value = order.shipping_cost || 0;
  document.getElementById('order-status').value = order.status;
  document.getElementById('order-address').value = order.shipping_address;
  document.getElementById('order-tracking').value = order.tracking_number || '';
  document.getElementById('order-courier').value = order.courier || '';
  document.getElementById('order-note').value = order.note || '';

  document.getElementById('order-form-title').textContent = '✏️ แก้ไขออเดอร์';
  document.getElementById('add-order-btn').textContent = '💾 บันทึกการแก้ไข';
  document.getElementById('cancel-order-edit-btn').classList.remove('hidden');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('cancel-order-edit-btn').addEventListener('click', () => {
  document.getElementById('order-form').reset();
  document.getElementById('order-edit-id').value = '';
  document.getElementById('order-form-title').textContent = 'สร้างออเดอร์จัดส่ง';
  document.getElementById('add-order-btn').textContent = '✓ สร้างออเดอร์';
  document.getElementById('cancel-order-edit-btn').classList.add('hidden');
  updateCustomerSelectOptions();
  document.getElementById('order-save-customer').checked = false;
});

document.getElementById('order-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const editId = document.getElementById('order-edit-id').value;
  const btn = document.getElementById('add-order-btn');
  
  if (!editId && allData.length >= 999) {
    showToast('ถึงขีดจำกัด 999 รายการแล้ว กรุณาลบรายการเก่าก่อน', 'error');
    return;
  }

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = editId ? '⏳ กำลังบันทึก...' : '⏳ กำลังสร้าง...';

  const sku = document.getElementById('order-product').value;
  const quantity = parseInt(document.getElementById('order-quantity').value);
  const product = allData.find(p => p.type === 'product' && p.sku === sku);
  const selectedCustomerId = document.getElementById('order-customer-select').value;
  const shouldSaveCustomer = document.getElementById('order-save-customer').checked;
  const customerName = document.getElementById('order-customer').value;
  const customerPhone = document.getElementById('order-customer-phone').value;
  const customerAddress = document.getElementById('order-address').value;
  const customerNote = document.getElementById('order-note').value;

  if (!product) {
    btn.disabled = false;
    btn.textContent = originalText;
    showToast('✕ ไม่พบสินค้า', 'error');
    return;
  }

  let customerIdForOrder = selectedCustomerId || null;
  if (shouldSaveCustomer) {
    customerIdForOrder = await saveCustomerFromOrder({
      existingId: selectedCustomerId,
      name: customerName,
      phone: customerPhone,
      address: customerAddress,
      note: customerNote
    });
    document.getElementById('order-save-customer').checked = false;
    updateCustomerSelectOptions();
  }

  if (editId) {
    const order = allData.find(o => o.__backendId === editId);
    if (order) {
      const oldQuantity = order.quantity;
      const oldSku = order.sku;
      
      if (oldSku !== sku) {
        const oldProduct = allData.find(p => p.type === 'product' && p.sku === oldSku);
        if (oldProduct) {
          oldProduct.quantity += oldQuantity;
          oldProduct.updated_at = new Date().toISOString();
          await window.dataSdk.update(oldProduct);
        }
        
        if (quantity > product.quantity) {
          btn.disabled = false;
          btn.textContent = originalText;
          showToast('✕ สต๊อกสินค้าไม่เพียงพอ', 'error');
          return;
        }
        
        product.quantity -= quantity;
        product.updated_at = new Date().toISOString();
        await window.dataSdk.update(product);
      } else {
        const stockDiff = quantity - oldQuantity;
        if (stockDiff > product.quantity) {
          btn.disabled = false;
          btn.textContent = originalText;
          showToast('✕ สต๊อกสินค้าไม่เพียงพอ', 'error');
          return;
        }
        
        product.quantity -= stockDiff;
        product.updated_at = new Date().toISOString();
        await window.dataSdk.update(product);
      }

      order.order_id = document.getElementById('order-id').value;
      order.customer_name = customerName;
      order.customer_phone = customerPhone;
      order.customer_id = customerIdForOrder;
      order.product_name = product.product_name;
      order.sku = sku;
      order.quantity = quantity;
      order.shipping_address = customerAddress;
      order.shipping_cost = parseFloat(document.getElementById('order-shipping').value);
      order.status = document.getElementById('order-status').value;
      order.tracking_number = document.getElementById('order-tracking').value;
      order.courier = document.getElementById('order-courier').value;
      order.note = customerNote;
      order.updated_at = new Date().toISOString();

      const result = await window.dataSdk.update(order);
      
      if (result.isOk) {
        showToast('✓ แก้ไขออเดอร์สำเร็จ', 'success');
        document.getElementById('order-form').reset();
        document.getElementById('order-edit-id').value = '';
        document.getElementById('order-form-title').textContent = 'สร้างออเดอร์จัดส่ง';
        document.getElementById('add-order-btn').textContent = '✓ สร้างออเดอร์';
        document.getElementById('cancel-order-edit-btn').classList.add('hidden');
        updateCustomerSelectOptions();
        document.getElementById('order-save-customer').checked = false;
      } else {
        showToast('✕ เกิดข้อผิดพลาดในการแก้ไขออเดอร์', 'error');
      }
    }
  } else {
    if (quantity > product.quantity) {
      btn.disabled = false;
      btn.textContent = originalText;
      showToast('✕ สต๊อกสินค้าไม่เพียงพอ', 'error');
      return;
    }

    const orderData = {
      type: 'order',
      order_id: document.getElementById('order-id').value,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_id: customerIdForOrder,
      product_name: product.product_name,
      sku: sku,
      quantity: quantity,
      shipping_address: customerAddress,
      shipping_cost: parseFloat(document.getElementById('order-shipping').value),
      status: document.getElementById('order-status').value,
      tracking_number: document.getElementById('order-tracking').value,
      courier: document.getElementById('order-courier').value,
      note: customerNote,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const createResult = await window.dataSdk.create(orderData);
    
    if (createResult.isOk) {
      product.quantity -= quantity;
      product.updated_at = new Date().toISOString();
      const updateResult = await window.dataSdk.update(product);
      
      if (updateResult.isOk) {
        showToast('✓ สร้างออเดอร์สำเร็จ', 'success');
        e.target.reset();
        updateCustomerSelectOptions();
        document.getElementById('order-save-customer').checked = false;
      } else {
        showToast('⚠️ สร้างออเดอร์สำเร็จ แต่ไม่สามารถอัพเดทสต๊อกได้', 'warning');
      }
    } else {
      showToast('✕ เกิดข้อผิดพลาดในการสร้างออเดอร์', 'error');
    }
  }

  btn.disabled = false;
  btn.textContent = originalText;
});

async function adjustStock(backendId, change) {
  const product = allData.find(p => p.__backendId === backendId);
  if (!product) return;

  const oldQuantity = product.quantity;
  const newQuantity = product.quantity + change;

  if (newQuantity < 0) {
    showToast('✕ จำนวนสินค้าไม่สามารถติดลบได้', 'error');
    return;
  }

  // Optimistically update the UI first
  product.quantity = newQuantity;
  product.updated_at = new Date().toISOString();
  updateAllViews(); // Update UI immediately

  // If Google Sheet is active, push to it
  if (isGoogleSheetStorageActive()) {
    try {
      await pushProductToGoogleSheet(product);
      showToast('✓ อัพเดทสต๊อกใน Google Sheet แล้ว', 'success');
    } catch (e) {
      // Revert quantity and UI if push fails
      product.quantity = oldQuantity;
      updateAllViews();
      showToast(`✕ อัพเดท Google Sheet ไม่สำเร็จ: ${e.message}`, 'error');
    }
    return;
  }

  // Fallback to original dataSdk logic if Google Sheet is not active
  const result = await window.dataSdk.update(product);
  if (result.isOk) {
    showToast('✓ อัพเดทสต๊อกแล้ว', 'success');
  } else {
    // Revert quantity and UI on failure
    product.quantity = oldQuantity;
    updateAllViews();
    showToast('✕ เกิดข้อผิดพลาดในการอัพเดทสต๊อก', 'error');
  }
}

async function deleteProduct(backendId) {
  const product = allData.find(p => p.__backendId === backendId);
  if (!product) return;

  const confirmBtn = event.target;
  const originalText = confirmBtn.textContent;
  confirmBtn.textContent = '⚠️ ยืนยัน?';
  confirmBtn.classList.add('font-bold', 'text-red-300');

  setTimeout(async () => {
    if (confirmBtn.textContent === '⚠️ ยืนยัน?') {
      confirmBtn.disabled = true;
      confirmBtn.textContent = '⏳ กำลังลบ...';
      let result = { isOk: true };
      const sdkAvailable = typeof window !== 'undefined' && window.dataSdk && typeof window.dataSdk.delete === 'function';
      if (sdkAvailable) {
        try {
          result = await window.dataSdk.delete(product);
        } catch (error) {
          console.error('delete product failed', error);
          result = { isOk: false };
        }
      }
      if (result.isOk) {
        allData = allData.filter(item => item.__backendId !== backendId);
        if (typeof updateAllViews === 'function') {
          updateAllViews();
        }
        await deleteProductOnGoogleSheet(product.sku);
        showToast('✓ ลบสินค้าสำเร็จ', 'success');
      } else {
        showToast('✕ เกิดข้อผิดพลาดในการลบสินค้า', 'error');
      }
      confirmBtn.disabled = false;
    }
    confirmBtn.textContent = originalText;
    confirmBtn.classList.remove('font-bold', 'text-red-300');
  }, 2000);
}

async function deleteOrder(backendId) {
  const order = allData.find(o => o.__backendId === backendId);
  if (!order) return;

  const confirmBtn = event.target;
  const originalText = confirmBtn.textContent;
  confirmBtn.textContent = '⚠️ ยืนยัน?';
  confirmBtn.classList.add('font-bold', 'text-red-300');

  setTimeout(async () => {
    if (confirmBtn.textContent === '⚠️ ยืนยัน?') {
      confirmBtn.disabled = true;
      confirmBtn.textContent = '⏳ กำลังลบ...';
      
      const product = allData.find(p => p.type === 'product' && p.sku === order.sku);
      if (product && order.status !== 'จัดส่งแล้ว') {
        product.quantity += order.quantity;
        product.updated_at = new Date().toISOString();
        await window.dataSdk.update(product);
      }
      
      const result = await window.dataSdk.delete(order);
      if (result.isOk) {
        showToast('✓ ลบออเดอร์สำเร็จ', 'success');
      } else {
        showToast('✕ เกิดข้อผิดพลาดในการลบออเดอร์', 'error');
      }
      confirmBtn.disabled = false;
    }
    confirmBtn.textContent = originalText;
    confirmBtn.classList.remove('font-bold', 'text-red-300');
  }, 2000);
}

async function deleteDamaged(backendId) {
  const damaged = allData.find(d => d.__backendId === backendId);
  if (!damaged) return;

  const confirmBtn = event.target;
  const originalText = confirmBtn.textContent;
  confirmBtn.textContent = '⚠️ ยืนยัน?';
  confirmBtn.classList.add('font-bold', 'text-red-300');

  setTimeout(async () => {
    if (confirmBtn.textContent === '⚠️ ยืนยัน?') {
      confirmBtn.disabled = true;
      confirmBtn.textContent = '⏳ กำลังลบ...';
      
      const product = allData.find(p => p.type === 'product' && p.sku === damaged.sku);
      if (product) {
        product.quantity += damaged.quantity;
        product.updated_at = new Date().toISOString();
        await window.dataSdk.update(product);
      }
      
      const result = await window.dataSdk.delete(damaged);
      if (result.isOk) {
        showToast('✓ ลบสินค้าชำรุดสำเร็จ', 'success');
      } else {
        showToast('✕ เกิดข้อผิดพลาดในการลบสินค้าชำรุด', 'error');
      }
      confirmBtn.disabled = false;
    }
    confirmBtn.textContent = originalText;
    confirmBtn.classList.remove('font-bold', 'text-red-300');
  }, 2000);
}

document.getElementById('export-btn').addEventListener('click', () => {
  const products = allData.filter(item => item.type === 'product');
  const orders = allData.filter(item => item.type === 'order');
  const damaged = allData.filter(item => item.type === 'damaged');

  let csv = 'ประเภท,ชื่อสินค้า,SKU,แบรนด์,หมวดหมู่,จำนวน,หน่วย,ราคาทุน,ราคาส่ง,ราคาขาย,ผู้จัดจำหน่าย,ตำแหน่ง,เลขออเดอร์,ลูกค้า,สถานะ,สาเหตุชำรุด,วันที่\n';

  products.forEach(p => {
    csv += `สินค้า,"${p.product_name}",${p.sku},"${p.brand || ''}",${p.category},${p.quantity},${p.unit || 'ชิ้น'},${p.cost_price},${p.wholesale_price || 0},${p.unit_price},"${p.supplier || ''}","${p.location || ''}",,,,,"${new Date(p.created_at).toLocaleDateString('th-TH')}"\n`;
  });

  orders.forEach(o => {
    csv += `ออเดอร์,"${o.product_name}",${o.sku},,,${o.quantity},,,,,,${o.order_id},"${o.customer_name}",${o.status},,"${new Date(o.created_at).toLocaleDateString('th-TH')}"\n`;
  });

  damaged.forEach(d => {
    csv += `สินค้าชำรุด,"${d.product_name}",${d.sku},,,${d.quantity},,,,,,,,,"${d.damage_reason}","${new Date(d.created_at).toLocaleDateString('th-TH')}"\n`;
  });

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `ฮักเดินดอย_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

function calculatePrices() {
  const cost = parseFloat(document.getElementById('product-cost').value) || 0;
  const margin = parseFloat(document.getElementById('profit-margin').value) || 0;
  
  if (cost > 0 && margin > 0) {
    const wholesalePrice = cost * (1 + (margin * 0.7) / 100);
    const retailPrice = cost * (1 + margin / 100);
    
    document.getElementById('product-wholesale').value = wholesalePrice.toFixed(2);
    document.getElementById('product-price').value = retailPrice.toFixed(2);
    
    const wholesaleProfit = wholesalePrice - cost;
    const retailProfit = retailPrice - cost;
    
    document.getElementById('wholesale-profit').textContent = `+฿${wholesaleProfit.toFixed(2)}`;
    document.getElementById('retail-profit').textContent = `+฿${retailProfit.toFixed(2)}`;
  } else {
    document.getElementById('wholesale-profit').textContent = '';
    document.getElementById('retail-profit').textContent = '';
  }
}

document.getElementById('product-cost').addEventListener('input', calculatePrices);
document.getElementById('profit-margin').addEventListener('change', calculatePrices);

document.getElementById('product-wholesale').addEventListener('input', function() {
  const cost = parseFloat(document.getElementById('product-cost').value) || 0;
  const wholesale = parseFloat(this.value) || 0;
  if (cost > 0 && wholesale > 0) {
    const profit = wholesale - cost;
    document.getElementById('wholesale-profit').textContent = `+฿${profit.toFixed(2)}`;
  }
});

const savedCustomerSelect = document.getElementById('order-customer-select');
if (savedCustomerSelect) {
  savedCustomerSelect.addEventListener('change', () => {
    const customer = findCustomerById(savedCustomerSelect.value);
    if (customer) {
      document.getElementById('order-customer').value = customer.name || '';
      document.getElementById('order-customer-phone').value = customer.phone || '';
      document.getElementById('order-address').value = customer.address || '';
      document.getElementById('order-save-customer').checked = false;
    }
  });
}

const manageCustomersShortcut = document.getElementById('manage-customers-shortcut');
if (manageCustomersShortcut) {
  manageCustomersShortcut.addEventListener('click', () => {
    const tabBtn = document.querySelector('[data-tab="customers"]');
    if (tabBtn) {
      tabBtn.click();
    }
    document.getElementById('customer-name')?.focus();
  });
}

const customerSearchInput = document.getElementById('customer-search');
if (customerSearchInput) {
  customerSearchInput.addEventListener('input', renderCustomerList);
}

const customerForm = document.getElementById('customer-form');
if (customerForm) {
  customerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const editId = document.getElementById('customer-edit-id').value;
    const name = document.getElementById('customer-name').value.trim();
    if (!name) {
      showToast('กรุณาระบุชื่อลูกค้า', 'error');
      return;
    }
    if (editId) {
      const target = findCustomerById(editId);
      if (!target) {
        showToast('ไม่พบข้อมูลลูกค้าที่ต้องการแก้ไข', 'error');
        return;
      }
      target.name = name;
      target.phone = document.getElementById('customer-phone').value;
      target.address = document.getElementById('customer-address').value;
      target.note = document.getElementById('customer-note').value;
      const updated = await persistCustomerRecord(target, true);
      if (updated) {
        showToast('บันทึกข้อมูลลูกค้าแล้ว', 'success');
        resetCustomerForm();
        updateCustomerUI();
        pushCustomerToGoogleSheet(target);
      } else {
        showToast('ไม่สามารถบันทึกข้อมูลลูกค้าได้', 'error');
      }
    } else {
      const newCustomer = {
        type: 'customer',
        customer_id: generateCustomerId(),
        name,
        phone: document.getElementById('customer-phone').value,
        address: document.getElementById('customer-address').value,
        note: document.getElementById('customer-note').value,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const created = await persistCustomerRecord(newCustomer, false);
      if (created) {
        showToast('เพิ่มลูกค้าใหม่สำเร็จ', 'success');
        resetCustomerForm();
        updateCustomerUI();
        pushCustomerToGoogleSheet(newCustomer);
      } else {
        showToast('ไม่สามารถเพิ่มลูกค้าใหม่ได้', 'error');
      }
    }
  });
}

const cancelCustomerEditBtn = document.getElementById('cancel-customer-edit-btn');
if (cancelCustomerEditBtn) {
  cancelCustomerEditBtn.addEventListener('click', () => {
    resetCustomerForm();
  });
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const error = document.getElementById('login-error');
    const user = findUserByCredentials(username, password);
    if (!user) {
      if (error) {
        error.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        error.classList.remove('hidden');
      }
      showToast('เข้าสู่ระบบไม่สำเร็จ', 'error');
      return;
    }
    if (error) {
      error.classList.add('hidden');
    }
    handleLoginSuccess(user);
  });
}

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    resetToLogin();
    showToast('ออกจากระบบเรียบร้อย', 'info');
  });
}

document.getElementById('product-price').addEventListener('input', function() {
  const cost = parseFloat(document.getElementById('product-cost').value) || 0;
  const retail = parseFloat(this.value) || 0;
  if (cost > 0 && retail > 0) {
    const profit = retail - cost;
    document.getElementById('retail-profit').textContent = `+฿${profit.toFixed(2)}`;
  }
});

function toggleProductForm() {
  const container = document.getElementById('product-form-container');
  const icon = document.getElementById('form-toggle-icon');
  
  if (container.style.display === 'none') {
    container.style.display = 'block';
    icon.textContent = '▼';
    icon.style.transform = 'rotate(0deg)';
  } else {
    container.style.display = 'none';
    icon.textContent = '▶';
    icon.style.transform = 'rotate(-90deg)';
  }
}

function generateSKU() {
  const category = document.getElementById('product-category').value;
  const brand = document.getElementById('product-brand').value;
  
  if (!category) {
    showToast('⚠️ กรุณาเลือกหมวดหมู่ก่อน', 'warning');
    return;
  }
  
  const categoryMap = {
    'แจ็คเก็ต': 'JK',
    'กระเป้า': 'BG',
    'รองเท้า': 'SH',
    'อุปกรณ์': 'EQ',
    'เสื้อผ้า': 'CL',
    'กางเกง': 'PT',
    'หมวก': 'HT',
    'ถุงเท้า': 'SK',
    'อื่นๆ': 'OT'
  };
  
  const categoryCode = categoryMap[category] || 'XX';
  const brandCode = brand ? brand.substring(0, 2).toUpperCase() : 'XX';
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  
  const sku = `${categoryCode}-${brandCode}-${randomNum}`;
  document.getElementById('product-sku').value = sku;
  showToast('✓ สร้างรหัสสินค้าสำเร็จ', 'success');
}

document.getElementById('product-category').addEventListener('change', function() {
  const skuInput = document.getElementById('product-sku');
  if (!skuInput.value || skuInput.value.trim() === '') {
    generateSKU();
  }
});

document.getElementById('product-brand').addEventListener('blur', function() {
  const skuInput = document.getElementById('product-sku');
  const category = document.getElementById('product-category').value;
  if (category && (!skuInput.value || skuInput.value.trim() === '')) {
    generateSKU();
  }
});

// Event listeners สำหรับตัวกรองและค้นหา
document.getElementById('search-product').addEventListener('input', updateProductsList);
document.getElementById('filter-category').addEventListener('change', updateProductsList);
document.getElementById('filter-brand').addEventListener('change', updateProductsList);
document.getElementById('filter-stock').addEventListener('change', updateProductsList);

// Event listeners สำหรับตัวกรองประวัติ
document.getElementById('search-history').addEventListener('input', updateHistory);
document.getElementById('filter-history-category').addEventListener('change', updateHistory);
document.getElementById('filter-history-time').addEventListener('change', updateHistory);

// Event listener สำหรับตัวกรองสถานะออเดอร์
document.getElementById('filter-order-status').addEventListener('change', updateOrdersList);

// Event listener สำหรับตัวกรองช่วงเวลาในแดชบอร์ด
document.getElementById('dashboard-period-filter').addEventListener('change', function() {
  const customDateRange = document.getElementById('dashboard-custom-date-range');
  if (this.value === 'custom') {
    customDateRange.classList.remove('hidden');
    // ตั้งค่าวันที่เริ่มต้น
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);
    document.getElementById('dashboard-start-date').value = lastMonth.toISOString().split('T')[0];
    document.getElementById('dashboard-end-date').value = today.toISOString().split('T')[0];
  } else {
    customDateRange.classList.add('hidden');
    updateDashboard();
  }
});

// Event listener สำหรับปุ่มใช้งานวันที่กำหนดเองในแดชบอร์ด
document.getElementById('apply-dashboard-custom-date').addEventListener('click', function() {
  const startDate = document.getElementById('dashboard-start-date').value;
  const endDate = document.getElementById('dashboard-end-date').value;
  
  if (!startDate || !endDate) {
    showToast('⚠️ กรุณาเลือกวันที่เริ่มต้นและสิ้นสุด', 'warning');
    return;
  }
  
  if (new Date(startDate) > new Date(endDate)) {
    showToast('⚠️ วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด', 'warning');
    return;
  }
  
  updateDashboard();
});

// Event listener สำหรับปุ่มล้างวันที่กำหนดเองในแดชบอร์ด
document.getElementById('clear-dashboard-custom-date').addEventListener('click', function() {
  document.getElementById('dashboard-start-date').value = '';
  document.getElementById('dashboard-end-date').value = '';
  document.getElementById('dashboard-period-filter').value = 'all';
  document.getElementById('dashboard-custom-date-range').classList.add('hidden');
  updateDashboard();
});

// Event listener สำหรับตัวกรองช่วงเวลาในการเงิน
document.getElementById('finance-period-filter').addEventListener('change', function() {
  const customDateRange = document.getElementById('custom-date-range');
  if (this.value === 'custom') {
    customDateRange.classList.remove('hidden');
    // ตั้งค่าวันที่เริ่มต้น
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);
    document.getElementById('finance-start-date').value = lastMonth.toISOString().split('T')[0];
    document.getElementById('finance-end-date').value = today.toISOString().split('T')[0];
  } else {
    customDateRange.classList.add('hidden');
    updateFinance();
  }
});

// Event listener สำหรับปุ่มใช้งานวันที่กำหนดเอง
document.getElementById('apply-custom-date').addEventListener('click', function() {
  const startDate = document.getElementById('finance-start-date').value;
  const endDate = document.getElementById('finance-end-date').value;
  
  if (!startDate || !endDate) {
    showToast('⚠️ กรุณาเลือกวันที่เริ่มต้นและสิ้นสุด', 'warning');
    return;
  }
  
  if (new Date(startDate) > new Date(endDate)) {
    showToast('⚠️ วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด', 'warning');
    return;
  }
  
  updateFinance();
});

// Event listener สำหรับปุ่มล้างวันที่กำหนดเอง
document.getElementById('clear-custom-date').addEventListener('click', function() {
  document.getElementById('finance-start-date').value = '';
  document.getElementById('finance-end-date').value = '';
  document.getElementById('finance-period-filter').value = 'all';
  document.getElementById('custom-date-range').classList.add('hidden');
  updateFinance();
});

// ฟังก์ชันส่งออกรายงาน การเงิน
document.getElementById('export-finance-btn').addEventListener('click', function() {
  const products = allData.filter(item => item.type === 'product');
  const periodFilter = document.getElementById('finance-period-filter')?.value || 'all';
  const now = new Date();
  
  let filteredOrders = allData.filter(item => item.type === 'order' && item.status === 'จัดส่งแล้ว');
  let filteredDamaged = allData.filter(item => item.type === 'damaged');
  let periodLabel = 'ทั้งหมด';
  
  if (periodFilter !== 'all') {
    const customStart = document.getElementById('finance-start-date')?.value;
    const customEnd = document.getElementById('finance-end-date')?.value;
    
    filteredOrders = filteredOrders.filter(o => {
      const orderDate = new Date(o.created_at);
      return isInPeriod(orderDate, periodFilter, now, customStart, customEnd);
    });
    
    filteredDamaged = filteredDamaged.filter(d => {
      const damageDate = new Date(d.created_at);
      return isInPeriod(damageDate, periodFilter, now, customStart, customEnd);
    });
    
    if (periodFilter === 'today') {
      periodLabel = `วันนี้_${now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } else if (periodFilter === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      periodLabel = `เมื่อวาน_${yesterday.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } else if (periodFilter === 'week') {
      periodLabel = 'สัปดาห์นี้';
    } else if (periodFilter === 'last-week') {
      periodLabel = 'สัปดาห์ที่แล้ว';
    } else if (periodFilter === 'month') {
      periodLabel = `เดือน${now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}`;
    } else if (periodFilter === 'last-month') {
      const lastMonth = new Date(now);
      lastMonth.setMonth(now.getMonth() - 1);
      periodLabel = `เดือน${lastMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}`;
    } else if (periodFilter === 'year') {
      periodLabel = `ปี${now.toLocaleDateString('th-TH', { year: 'numeric' })}`;
    } else if (periodFilter === 'last-year') {
      periodLabel = `ปี${(now.getFullYear() - 1).toString()}`;
    } else if (periodFilter === 'custom' && customStart && customEnd) {
      const startDate = new Date(customStart);
      const endDate = new Date(customEnd);
      periodLabel = `${startDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}_ถึง_${endDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
  }
  
  const orders = filteredOrders;
  const damaged = filteredDamaged;

  // คำนวณข้อมูลการเงิน
  let totalRevenue = 0;
  let costOfGoods = 0;
  let shippingCosts = 0;
  let orderDetails = [];

  orders.forEach(order => {
    const product = products.find(p => p.sku === order.sku);
    if (product) {
      const orderValue = order.quantity * product.unit_price;
      const orderCost = order.quantity * product.cost_price;
      const orderProfit = orderValue - orderCost - (order.shipping_cost || 0);
      
      totalRevenue += orderValue;
      costOfGoods += orderCost;
      shippingCosts += order.shipping_cost || 0;
      
      orderDetails.push({
        date: new Date(order.created_at).toLocaleDateString('th-TH'),
        orderId: order.order_id,
        customer: order.customer_name,
        product: order.product_name,
        sku: order.sku,
        quantity: order.quantity,
        unitPrice: product.unit_price,
        unitCost: product.cost_price,
        revenue: orderValue,
        cost: orderCost,
        shipping: order.shipping_cost || 0,
        profit: orderProfit
      });
    }
  });

  let damagedCosts = 0;
  let damagedDetails = [];
  damaged.forEach(item => {
    const product = products.find(p => p.sku === item.sku);
    if (product) {
      const loss = item.quantity * product.cost_price;
      damagedCosts += loss;
      
      damagedDetails.push({
        date: new Date(item.created_at).toLocaleDateString('th-TH'),
        product: item.product_name,
        sku: item.sku,
        quantity: item.quantity,
        unitCost: product.cost_price,
        totalLoss: loss,
        reason: item.damage_reason
      });
    }
  });

  const totalExpenses = costOfGoods + shippingCosts + damagedCosts;
  const netProfit = totalRevenue - totalExpenses;
  const grossProfit = totalRevenue - costOfGoods;
  const grossMargin = totalRevenue > 0 ? ((totalRevenue - costOfGoods) / totalRevenue * 100) : 0;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0;
  
  const inventoryValue = products.reduce((sum, p) => sum + (p.quantity * p.cost_price), 0);
  const potentialRevenue = products.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0);
  const potentialProfit = potentialRevenue - inventoryValue;

  // สร้างไฟล์ CSV
  let csv = '\ufeff'; // BOM for UTF-8
  
  // ส่วนหัวรายงาน
  csv += `รายงานการเงิน - ฮักเดินดอย\n`;
  csv += `ช่วงเวลา: ${periodLabel}\n`;
  csv += `วันที่สร้างรายงาน: ${now.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}\n`;
  csv += `\n`;
  
  // สรุปภาพรวม
  csv += `สรุปภาพรวมการเงิน\n`;
  csv += `รายการ,จำนวน\n`;
  csv += `รายรับทั้งหมด,${totalRevenue.toFixed(2)}\n`;
  csv += `ต้นทุนสินค้าที่ขาย,${costOfGoods.toFixed(2)}\n`;
  csv += `ค่าจัดส่ง,${shippingCosts.toFixed(2)}\n`;
  csv += `ความเสียหายสินค้า,${damagedCosts.toFixed(2)}\n`;
  csv += `รายจ่ายทั้งหมด,${totalExpenses.toFixed(2)}\n`;
  csv += `กำไรขั้นต้น,${grossProfit.toFixed(2)}\n`;
  csv += `กำไร/ขาดทุนสุทธิ,${netProfit.toFixed(2)}\n`;
  csv += `อัตรากำไรขั้นต้น (%),${grossMargin.toFixed(2)}\n`;
  csv += `อัตรากำไรสุทธิ (%),${netMargin.toFixed(2)}\n`;
  csv += `\n`;
  
  // ข้อมูลสินค้าคงคลัง
  csv += `สถานะสินค้าคงคลัง\n`;
  csv += `รายการ,จำนวน\n`;
  csv += `มูลค่าสต๊อกคงเหลือ (ราคาทุน),${inventoryValue.toFixed(2)}\n`;
  csv += `มูลค่าสต๊อกคงเหลือ (ราคาขาย),${potentialRevenue.toFixed(2)}\n`;
  csv += `กำไรที่คาดหวัง,${potentialProfit.toFixed(2)}\n`;
  csv += `จำนวนสินค้าทั้งหมด,${products.reduce((sum, p) => sum + p.quantity, 0)}\n`;
  csv += `\n`;
  
  // รายละเอียดออเดอร์
  csv += `รายละเอียดออเดอร์ (${orders.length} รายการ)\n`;
  csv += `วันที่,เลขที่ออเดอร์,ลูกค้า,สินค้า,SKU,จำนวน,ราคาขาย/หน่วย,ต้นทุน/หน่วย,รายรับ,ต้นทุน,ค่าจัดส่ง,กำไร\n`;
  orderDetails.forEach(order => {
    csv += `${order.date},"${order.orderId}","${order.customer}","${order.product}",${order.sku},${order.quantity},${order.unitPrice.toFixed(2)},${order.unitCost.toFixed(2)},${order.revenue.toFixed(2)},${order.cost.toFixed(2)},${order.shipping.toFixed(2)},${order.profit.toFixed(2)}\n`;
  });
  csv += `\n`;
  
  // รายละเอียดสินค้าชำรุด
  csv += `รายละเอียดสินค้าชำรุด (${damaged.length} รายการ)\n`;
  csv += `วันที่,สินค้า,SKU,จำนวน,ต้นทุน/หน่วย,มูลค่าสูญเสีย,สาเหตุ\n`;
  damagedDetails.forEach(item => {
    csv += `${item.date},"${item.product}",${item.sku},${item.quantity},${item.unitCost.toFixed(2)},${item.totalLoss.toFixed(2)},"${item.reason}"\n`;
  });
  csv += `\n`;
  
  // รายละเอียดสินค้าคงคลัง
  csv += `รายละเอียดสินค้าคงคลัง (${products.length} รายการ)\n`;
  csv += `SKU,ชื่อสินค้า,แบรนด์,หมวดหมู่,จำนวน,หน่วย,ราคาทุน/หน่วย,ราคาขาย/หน่วย,มูลค่าสต๊อก (ทุน),มูลค่าสต๊อก (ขาย),กำไรที่คาดหวัง\n`;
  products.forEach(p => {
    const stockValue = p.quantity * p.cost_price;
    const stockRevenue = p.quantity * p.unit_price;
    const stockProfit = stockRevenue - stockValue;
    csv += `${p.sku},"${p.product_name}","${p.brand || ''}",${p.category},${p.quantity},${p.unit || 'ชิ้น'},${p.cost_price.toFixed(2)},${p.unit_price.toFixed(2)},${stockValue.toFixed(2)},${stockRevenue.toFixed(2)},${stockProfit.toFixed(2)}\n`;
  });
  
  // ดาวน์โหลดไฟล์
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const filename = `รายงานการเงิน_${periodLabel}_${now.toISOString().split('T')[0]}.csv`;
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast('✓ ส่งออกรายงานการเงินสำเร็จ', 'success');
});

// ฟังก์ชันสำหรับ Tracking Modal
function viewTracking(backendId) {
  const order = allData.find(o => o.__backendId === backendId);
  if (!order) return;

  document.getElementById('tracking-order-id').value = backendId;
  
  // แสดงข้อมูลออเดอร์
  const orderInfo = document.getElementById('tracking-order-info');
  orderInfo.innerHTML = `
    <div class="grid grid-cols-2 gap-3 text-sm">
      <div>
        <p class="text-gray-400">เลขที่ออเดอร์</p>
        <p class="font-semibold text-amber-400">${order.order_id}</p>
      </div>
      <div>
        <p class="text-gray-400">ลูกค้า</p>
        <p class="font-semibold">${order.customer_name}</p>
      </div>
      <div>
        <p class="text-gray-400">สินค้า</p>
        <p class="font-semibold">${order.product_name}</p>
      </div>
      <div>
        <p class="text-gray-400">จำนวน</p>
        <p class="font-semibold">${order.quantity} ชิ้น</p>
      </div>
      <div>
        <p class="text-gray-400">บริษัทขนส่ง</p>
        <p class="font-semibold">${order.courier || '-'}</p>
      </div>
      <div>
        <p class="text-gray-400">เลขติดตามพัสดุ</p>
        <p class="font-semibold font-mono text-green-400">${order.tracking_number || '-'}</p>
      </div>
      <div class="col-span-2">
        <p class="text-gray-400">ที่อยู่จัดส่ง</p>
        <p class="font-semibold">${order.shipping_address}</p>
      </div>
    </div>
  `;

  // แสดงประวัติการติดตาม
  updateTrackingHistory(backendId);

  // แสดง modal
  document.getElementById('tracking-modal').classList.remove('hidden');
}

function closeTrackingModal() {
  document.getElementById('tracking-modal').classList.add('hidden');
  document.getElementById('tracking-form').reset();
}

function updateTrackingHistory(orderBackendId) {
  const trackingHistory = allData.filter(item => 
    item.type === 'tracking' && item.order_backend_id === orderBackendId
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const container = document.getElementById('tracking-history-list');
  
  if (trackingHistory.length === 0) {
    container.innerHTML = '<p class="text-gray-400 text-center py-4">ยังไม่มีประวัติการติดตาม</p>';
    return;
  }

  container.innerHTML = trackingHistory.map((track, index) => {
    const date = new Date(track.created_at);
    const dateStr = date.toLocaleDateString('th-TH', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    const timeStr = date.toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    let statusColor = 'bg-gray-600';
    if (track.status === 'รอจัดส่ง') statusColor = 'bg-yellow-600';
    else if (track.status === 'กำลังเตรียมสินค้า') statusColor = 'bg-orange-600';
    else if (track.status === 'พร้อมจัดส่ง') statusColor = 'bg-purple-600';
    else if (track.status === 'กำลังจัดส่ง') statusColor = 'bg-blue-600';
    else if (track.status === 'จัดส่งแล้ว') statusColor = 'bg-green-600';
    else if (track.status === 'ยกเลิก') statusColor = 'bg-red-600';

    return `
      <div class="bg-gray-700 rounded-lg p-4 relative">
        ${index === 0 ? '<div class="absolute -top-2 -right-2 bg-amber-500 text-gray-900 text-xs font-bold px-2 py-1 rounded">ล่าสุด</div>' : ''}
        <div class="flex justify-between items-start mb-2">
          <span class="text-xs px-2 py-1 rounded font-medium ${statusColor}">${track.status}</span>
          <div class="text-right text-xs text-gray-400">
            <div>${dateStr}</div>
            <div>${timeStr}</div>
          </div>
        </div>
        ${track.location ? `<p class="text-sm text-gray-300 mb-1">📍 ${track.location}</p>` : ''}
        <p class="text-sm text-gray-300">${track.remark}</p>
        <div class="flex justify-end gap-2 mt-2">
          <button onclick="deleteTracking('${track.__backendId}')" class="text-red-400 hover:text-red-300 text-xs font-medium transition-colors">🗑️ ลบ</button>
        </div>
      </div>
    `;
  }).join('');
}

// ฟอร์มเพิ่มสถานะการติดตาม
document.getElementById('tracking-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (allData.length >= 999) {
    showToast('ถึงขีดจำกัด 999 รายการแล้ว กรุณาลบรายการเก่าก่อน', 'error');
    return;
  }

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = '⏳ กำลังบันทึก...';

  const orderBackendId = document.getElementById('tracking-order-id').value;
  const order = allData.find(o => o.__backendId === orderBackendId);
  
  if (!order) {
    btn.disabled = false;
    btn.textContent = originalText;
    showToast('✕ ไม่พบออเดอร์', 'error');
    return;
  }

  const trackingData = {
    type: 'tracking',
    order_backend_id: orderBackendId,
    order_id: order.order_id,
    status: document.getElementById('tracking-status').value,
    location: document.getElementById('tracking-location').value,
    remark: document.getElementById('tracking-remark').value,
    created_at: new Date().toISOString()
  };

  const result = await window.dataSdk.create(trackingData);
  
  if (result.isOk) {
    // อัพเดทสถานะออเดอร์
    order.status = trackingData.status;
    order.updated_at = new Date().toISOString();
    await window.dataSdk.update(order);
    
    showToast('✓ เพิ่มสถานะการจัดส่งสำเร็จ', 'success');
    e.target.reset();
    updateTrackingHistory(orderBackendId);
  } else {
    showToast('✕ เกิดข้อผิดพลาดในการเพิ่มสถานะ', 'error');
  }

  btn.disabled = false;
  btn.textContent = originalText;
});

async function deleteTracking(backendId) {
  const tracking = allData.find(t => t.__backendId === backendId);
  if (!tracking) return;

  const confirmBtn = event.target;
  const originalText = confirmBtn.textContent;
  confirmBtn.textContent = '⚠️ ยืนยัน?';
  confirmBtn.classList.add('font-bold');

  setTimeout(async () => {
    if (confirmBtn.textContent === '⚠️ ยืนยัน?') {
      confirmBtn.disabled = true;
      confirmBtn.textContent = '⏳ กำลังลบ...';
      
      const result = await window.dataSdk.delete(tracking);
      if (result.isOk) {
        showToast('✓ ลบประวัติการติดตามสำเร็จ', 'success');
        updateTrackingHistory(tracking.order_backend_id);
      } else {
        showToast('✕ เกิดข้อผิดพลาดในการลบประวัติ', 'error');
      }
      confirmBtn.disabled = false;
    }
    confirmBtn.textContent = originalText;
    confirmBtn.classList.remove('font-bold');
  }, 2000);
}

window.viewTracking = viewTracking;
window.closeTrackingModal = closeTrackingModal;
window.deleteTracking = deleteTracking;

// ฟอร์มเพิ่มสต๊อก
document.getElementById('add-stock-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (allData.length >= 999) {
    showToast('ถึงขีดจำกัด 999 รายการแล้ว กรุณาลบรายการเก่าก่อน', 'error');
    return;
  }

  const sdkAvailable = typeof window !== 'undefined' && window.dataSdk && typeof window.dataSdk.update === 'function';
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ กำลังเพิ่ม...';

  const sku = document.getElementById('add-stock-product').value;
  const quantityValue = document.getElementById('add-stock-quantity').value;
  const quantity = parseInt(quantityValue, 10);

  if (!sku) {
    btn.disabled = false;
    btn.textContent = originalText;
    showToast('⚠️ กรุณาเลือกสินค้า', 'warning');
    return;
  }

  if (!quantity || isNaN(quantity) || quantity <= 0) {
    btn.disabled = false;
    btn.textContent = originalText;
    showToast('⚠️ จำนวนที่เพิ่มต้องมากกว่า 0', 'warning');
    return;
  }

  const product = allData.find(p => p.type === 'product' && p.sku === sku);
  if (!product) {
    btn.disabled = false;
    btn.textContent = originalText;
    showToast('✕ ไม่พบสินค้า', 'error');
    return;
  }

  const oldQuantity = product.quantity;
  product.quantity = (product.quantity || 0) + quantity;
  product.updated_at = new Date().toISOString();

  let updateResult = { isOk: true };
  if (sdkAvailable) {
    try {
      updateResult = await window.dataSdk.update(product);
    } catch (error) {
      console.error('update stock failed', error);
      updateResult = { isOk: false };
    }
  }

  if (updateResult.isOk) {
    const stockHistoryData = {
      type: 'stock_history',
      product_name: product.product_name,
      category: product.category,
      brand: product.brand,
      model: product.model,
      sku: product.sku,
      quantity_added: quantity,
      old_quantity: oldQuantity,
      new_quantity: product.quantity,
      unit: product.unit,
      cost_price: product.cost_price,
      unit_price: product.unit_price,
      created_at: new Date().toISOString()
    };

    if (sdkAvailable) {
      try {
        await window.dataSdk.create(stockHistoryData);
      } catch (error) {
        console.error('create stock history failed', error);
      }
    } else {
      stockHistoryData.__backendId = `stock-history-${Date.now()}`;
      allData.push(stockHistoryData);
    }

    if (!sdkAvailable && typeof updateAllViews === 'function') {
      updateAllViews();
    }

    showToast(`✓ เพิ่มสต๊อก ${product.product_name} จำนวน ${quantity} ${product.unit || 'ชิ้น'} สำเร็จ`, 'success');
    e.target.reset();
  } else {
    showToast('✕ เกิดข้อผิดพลาดในการเพิ่มสต๊อก', 'error');
  }

  btn.disabled = false;
  btn.textContent = originalText;
});

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  renderDropdownTypeOptions();
  updateDropdownEditor();
  updateProductSelects();
});

window.handleDropdownTypeChange = function(value) {
  updateDropdownEditor(value);
};

window.handleAddDropdown = async function(event) {
  if (event) {
    event.preventDefault();
  }
  if (!systemSettings) {
    systemSettings = cloneDefaultSettings();
    ensureDropdownDefaults(systemSettings);
  }
  const input = document.getElementById('dropdown-new-value');
  const value = input?.value.trim();
  if (!value) {
    showToast('กรุณากรอกค่าที่ต้องการเพิ่ม', 'warning');
    return;
  }
  const currentKey = activeDropdownKey || getCurrentDropdownKey();
  const list = systemSettings.dropdowns[currentKey] || [];
  if (list.includes(value)) {
    showToast('มีค่าซ้ำอยู่แล้ว', 'warning');
    return;
  }
  list.push(value);
  systemSettings.dropdowns[currentKey] = list;
  input.value = '';
  await persistSettingsChanges();
  renderDropdownOptions();
  updateDropdownEditor();
  showToast('เพิ่มตัวเลือกสำเร็จ', 'success');
};

window.handleRemoveDropdown = async function(value) {
  if (!value) return;
  if (!systemSettings) {
    systemSettings = cloneDefaultSettings();
    ensureDropdownDefaults(systemSettings);
  }
  const currentKey = activeDropdownKey || getCurrentDropdownKey();
  const list = systemSettings.dropdowns[currentKey] || [];
  systemSettings.dropdowns[currentKey] = list.filter(item => item !== value);
  await persistSettingsChanges();
  renderDropdownOptions();
  updateDropdownEditor();
  showToast('ลบตัวเลือกแล้ว', 'success');
};
