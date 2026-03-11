import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'hi';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Common
    'app.name': 'GPHDM National Scholarship Exam',
    'app.shortName': 'GPHDM',
    'app.tagline': 'GPHDM National Scholarship Exam',

    // Navigation
    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'nav.gallery': 'Gallery',
    'nav.register': 'Register',
    'nav.login': 'Login',
    'nav.dashboard': 'Dashboard',
    'nav.logout': 'Logout',
    'nav.verify': 'Verify Certificate',
    'nav.admin': 'Admin',

    // Home Page
    'home.hero.title': 'GPHDM National Scholarship Exam',
    'home.hero.missionLine': 'Through Gram Panchayat Help Mission',
    'home.hero.production': 'Official Scholarship Portal',
    'home.hero.subtitle': 'Empowering students across India through the GPHDM National Scholarship. Register now for Class 1-12 examinations.',
    'home.hero.registerBtn': 'Students Register Now',
    'home.hero.learnMore': 'Learn More',
    'home.registration.open': 'Registration Open for',
    'home.features.title': 'Why Choose GPHDM?',
    'home.features.subtitle': 'Our examination portal provides a fair, transparent, and rewarding platform.',
    'home.fees.title': 'Examination Donation',
    'home.fees.subtitle': 'Affordable donation structure for all students.',
    'home.fees.primary': 'Primary',
    'home.fees.middle': 'Middle',
    'home.fees.senior': 'Senior',
    'home.howItWorks.title': 'How It Works',
    'home.howItWorks.subtitle': 'Simple 4-step process from registration to scholarship.',
    'home.howItWorks.step1': 'Register',
    'home.howItWorks.step1Desc': 'Create your account using a Center Referral Code',
    'home.howItWorks.step2': 'Pay Fee',
    'home.howItWorks.step2Desc': 'Complete secure payment via Razorpay',
    'home.howItWorks.step3': 'Take Exam',
    'home.howItWorks.step3Desc': 'Attempt the timed examination',
    'home.howItWorks.step4': 'Get Results',
    'home.howItWorks.step4Desc': 'View rank and receive certificate',
    'home.centerCode.title': 'Earn with CenterCode Referral Program',
    'home.centerCode.subtitle': 'Join our referral network and earn rewards for every successful registration.',
    'home.scholarship.title': 'Scholarship Amounts',
    'home.scholarship.subtitle': 'Top performers in each class receive attractive scholarships.',
    'home.cta.title': 'Ready to Begin Your Journey?',
    'home.cta.subtitle': 'Join thousands of students across India.',

    // Registration Page
    'register.title': 'Student Registration',
    'register.subtitle': 'Create your account to access the scholarship examination',
    'register.step.personal': 'Personal',
    'register.step.personalDesc': 'Student & school details',
    'register.step.contact': 'Contact',
    'register.step.contactDesc': 'Mobile & email',
    'register.step.address': 'Address',
    'register.step.addressDesc': 'Location details',
    'register.step.consent': 'Consent',
    'register.step.consentDesc': 'Legal agreements',
    'register.step.review': 'Review',
    'register.step.reviewDesc': 'Confirm & submit',
    'register.field.name': 'Student Name',
    'register.field.fatherName': "Father's Name / Guardian",
    'register.field.class': 'Class',
    'register.field.schoolName': 'School Name',
    'register.field.schoolContact': 'School Contact',
    'register.field.mobile': 'Mobile Number',
    'register.field.email': 'Email Address',
    'register.field.referralCode': 'Referral Code',
    'register.referral.noCode': "Don't have a code? Use Master Code:",
    'register.referral.masterCodeHint': 'Enter code to proceed',
    'register.field.village': 'Village / Locality',
    'register.field.block': 'Block',
    'register.field.tahsil': 'Tahsil',
    'register.field.district': 'District',
    'register.field.state': 'State',
    'register.consent.title': 'Legal Consent Required',
    'register.consent.subtitle': 'Please read and accept all terms and policies.',
    'register.consent.terms': 'Terms of Service',
    'register.consent.privacy': 'Privacy Policy',
    'register.consent.referral': 'Referral Policy',
    'register.btn.next': 'Next',
    'register.btn.back': 'Back',
    'register.btn.submit': 'Complete Registration',
    'register.btn.submitting': 'Registering...',
    'register.alreadyRegistered': 'Already registered?',
    'register.loginHere': 'Login here',
    'register.examFee': 'Examination Donation',

    // Login Page
    'login.title': 'Student Login',
    'login.subtitle': 'Access your scholarship examination dashboard',
    'login.field.email': 'Email Address',
    'login.field.mobile': 'Mobile Number',
    'login.btn.login': 'Login',
    'login.btn.loggingIn': 'Logging in...',
    'login.noAccount': "Don't have an account?",
    'login.registerNow': 'Register Now',

    // Dashboard
    'dashboard.welcome': 'Welcome',
    'dashboard.overview': 'Overview',
    'dashboard.examStatus': 'Exam Status',
    'dashboard.wallet': 'Wallet',
    'dashboard.results': 'Results',
    'dashboard.certificates': 'Certificates',
    'dashboard.takeExam': 'Take Exam',
    'dashboard.payFee': 'Pay Fee',
    'dashboard.pendingPayment': 'Payment Pending',
    'dashboard.examCompleted': 'Exam Completed',
    'dashboard.viewResults': 'View Results',
    'dashboard.downloadCertificate': 'Download Certificate',

    // Admin
    'admin.dashboard': 'Admin Dashboard',
    'admin.students': 'Students',
    'admin.payments': 'Payments',
    'admin.scholarships': 'Scholarships',
    'admin.certificates': 'Certificates',
    'admin.settings': 'Settings',
    'admin.referrals': 'CenterCode',
    'admin.emails': 'Emails',
    'admin.totalStudents': 'Total Students',
    'admin.totalRevenue': 'Total Revenue',
    'admin.examsCompleted': 'Exams Completed',
    'admin.pendingApprovals': 'Pending Approvals',
    'admin.analytics': 'Analytics',
    'admin.registrationTrends': 'Registration Trends',
    'admin.revenueTrends': 'Revenue Trends',
    'admin.classWiseDistribution': 'Class-wise Distribution',
    'admin.referralStats': 'Referral Statistics',

    // Center Registration
    'center.register.title': 'Register Your Center',
    'center.register.subtitle': 'Apply to become an approved examination center',
    'center.details': 'Center Details',
    'center.ownerInfo': 'Owner Information',
    'center.address': 'Center Address',
    'center.documents': 'Documents',
    'center.field.centerName': 'Center Name',
    'center.field.centerType': 'Center Type',
    'center.field.ownerName': 'Owner Name',
    'center.field.ownerPhone': 'Owner Phone',
    'center.field.ownerEmail': 'Owner Email',
    'center.field.address': 'Full Address',
    'center.field.city': 'City',
    'center.field.pincode': 'Pincode',
    'center.field.idProof': 'ID Proof',
    'center.field.userPhoto': 'User Photo',
    'center.submit': 'Submit Application',
    'center.submitting': 'Submitting...',
    'center.terms': 'I agree to the Center Partnership Terms and Conditions',

    // Email
    'email.registration.subject': 'Registration Successful - GPHDM Scholarship Examination',
    'email.payment.subject': 'Payment Confirmation - GPHDM',
    'email.examReminder.subject': 'Exam Reminder - GPHDM Scholarship Examination',
    'email.result.subject': 'Your Results are Available - GPHDM',
    'email.certificate.subject': 'Certificate Issued - GPHDM Scholarship Examination',

    // Common Actions
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'action.delete': 'Delete',
    'action.edit': 'Edit',
    'action.view': 'View',
    'action.download': 'Download',
    'action.submit': 'Submit',
    'action.confirm': 'Confirm',
    'action.approve': 'Approve',
    'action.reject': 'Reject',
    'action.search': 'Search',
    'action.filter': 'Filter',
    'action.export': 'Export',
    'action.import': 'Import',

    // Status
    'status.pending': 'Pending',
    'status.approved': 'Approved',
    'status.rejected': 'Rejected',
    'status.active': 'Active',
    'status.blocked': 'Blocked',
    'status.success': 'Success',
    'status.failed': 'Failed',
    'status.sent': 'Sent',
    'status.delivered': 'Delivered',

    // Contact
    'contact.title': 'Contact Us',
    'contact.subtitle': 'Get in touch with our team',
    'contact.form.name': 'Your Name',
    'contact.form.email': 'Your Email',
    'contact.form.phone': 'Your Phone',
    'contact.form.message': 'Your Message',
    'contact.form.submit': 'Send Message',
    'contact.office': 'Office Address',
    'contact.hours': 'Working Hours',
    'contact.faq': 'Frequently Asked Questions',

    // Verification
    'verify.title': 'Certificate Verification',
    'verify.subtitle': 'Verify the authenticity of GPHDM certificates',
    'verify.enterCode': 'Enter Certificate ID',
    'verify.btn': 'Verify',
    'verify.valid': 'Valid Certificate',
    'verify.invalid': 'Invalid Certificate',

    // Footer
    'footer.quickLinks': 'Quick Links',
    'footer.contactUs': 'Contact Us',
    'footer.terms': 'Terms of Service',
    'footer.privacy': 'Privacy Policy',
    'footer.rights': 'All rights reserved',
  },
  hi: {
    // Common
    'app.name': 'जीपीएचडीएम राष्ट्रीय छात्रवृत्ति परीक्षा',
    'app.shortName': 'जीपीएचडीएम',
    'app.tagline': 'जीपीएचडीएम राष्ट्रीय छात्रवृत्ति परीक्षा',

    // Navigation
    'nav.home': 'होम',
    'nav.about': 'हमारे बारे में',
    'nav.contact': 'संपर्क करें',
    'nav.gallery': 'गैलरी',
    'nav.register': 'पंजीकरण',
    'nav.login': 'लॉगिन',
    'nav.dashboard': 'डैशबोर्ड',
    'nav.logout': 'लॉगआउट',
    'nav.verify': 'प्रमाणपत्र सत्यापन',
    'nav.admin': 'एडमिन',

    // Home Page
    'home.hero.title': 'जीपीएचडीएम राष्ट्रीय छात्रवृत्ति परीक्षा',
    'home.hero.missionLine': 'ग्राम पंचायत हेल्प मिशन के माध्यम से',
    'home.hero.production': 'आधिकारिक छात्रवृत्ति पोर्टल',
    'home.hero.subtitle': 'जीपीएचडीएम राष्ट्रीय छात्रवृत्ति के माध्यम से भारत भर के छात्रों को सशक्त बनाना। कक्षा 1-12 परीक्षाओं के लिए अभी पंजीकरण करें।',
    'home.hero.registerBtn': 'छात्र अभी पंजीकरण करें',
    'home.hero.learnMore': 'और जानें',
    'home.registration.open': 'पंजीकरण खुला है',
    'home.features.title': 'जीपीएचडीएम क्यों चुनें?',
    'home.features.subtitle': 'हमारा परीक्षा पोर्टल एक निष्पक्ष, पारदर्शी और पुरस्कृत मंच प्रदान करता है।',
    'home.fees.title': 'परीक्षा सहयोग राशि',
    'home.fees.subtitle': 'सभी छात्रों के लिए किफायती सहयोग राशि संरचना।',
    'home.fees.primary': 'प्राथमिक',
    'home.fees.middle': 'माध्यमिक',
    'home.fees.senior': 'उच्च माध्यमिक',
    'home.howItWorks.title': 'यह कैसे काम करता है',
    'home.howItWorks.subtitle': 'पंजीकरण से छात्रवृत्ति तक सरल 4-चरणीय प्रक्रिया।',
    'home.howItWorks.step1': 'पंजीकरण',
    'home.howItWorks.step1Desc': 'सेंटर रेफरल कोड का उपयोग करके अपना खाता बनाएं',
    'home.howItWorks.step2': 'शुल्क भुगतान',
    'home.howItWorks.step2Desc': 'रेजरपे के माध्यम से सुरक्षित भुगतान करें',
    'home.howItWorks.step3': 'परीक्षा दें',
    'home.howItWorks.step3Desc': 'समय-बद्ध परीक्षा का प्रयास करें',
    'home.howItWorks.step4': 'परिणाम प्राप्त करें',
    'home.howItWorks.step4Desc': 'रैंक देखें और प्रमाणपत्र प्राप्त करें',
    'home.centerCode.title': 'सेंटरकोड रेफरल प्रोग्राम से कमाएं',
    'home.centerCode.subtitle': 'हमारे रेफरल नेटवर्क से जुड़ें और प्रत्येक सफल पंजीकरण पर पुरस्कार अर्जित करें।',
    'home.scholarship.title': 'छात्रवृत्ति राशि',
    'home.scholarship.subtitle': 'प्रत्येक कक्षा में शीर्ष प्रदर्शनकर्ताओं को आकर्षक छात्रवृत्ति मिलती है।',
    'home.cta.title': 'अपनी यात्रा शुरू करने के लिए तैयार हैं?',
    'home.cta.subtitle': 'भारत भर के हजारों छात्रों से जुड़ें।',

    // Registration Page
    'register.title': 'छात्र पंजीकरण',
    'register.subtitle': 'छात्रवृत्ति परीक्षा तक पहुंचने के लिए अपना खाता बनाएं',
    'register.step.personal': 'व्यक्तिगत',
    'register.step.personalDesc': 'छात्र और स्कूल विवरण',
    'register.step.contact': 'संपर्क',
    'register.step.contactDesc': 'मोबाइल और ईमेल',
    'register.step.address': 'पता',
    'register.step.addressDesc': 'स्थान विवरण',
    'register.step.consent': 'सहमति',
    'register.step.consentDesc': 'कानूनी समझौते',
    'register.step.review': 'समीक्षा',
    'register.step.reviewDesc': 'पुष्टि करें और जमा करें',
    'register.field.name': 'छात्र का नाम',
    'register.field.fatherName': 'पिता का नाम / अभिभावक',
    'register.field.class': 'कक्षा',
    'register.field.schoolName': 'स्कूल का नाम',
    'register.field.schoolContact': 'स्कूल संपर्क',
    'register.field.mobile': 'मोबाइल नंबर',
    'register.field.email': 'ईमेल पता',
    'register.field.referralCode': 'रेफरल कोड',
    'register.referral.noCode': "कोड नहीं है? मास्टर कोड का उपयोग करें:",
    'register.referral.masterCodeHint': 'आगे बढ़ने के लिए कोड दर्ज करें',
    'register.field.village': 'गांव / इलाका',
    'register.field.block': 'ब्लॉक',
    'register.field.tahsil': 'तहसील',
    'register.field.district': 'जिला',
    'register.field.state': 'राज्य',
    'register.consent.title': 'कानूनी सहमति आवश्यक',
    'register.consent.subtitle': 'कृपया सभी नियमों और नीतियों को पढ़ें और स्वीकार करें।',
    'register.consent.terms': 'सेवा की शर्तें',
    'register.consent.privacy': 'गोपनीयता नीति',
    'register.consent.referral': 'रेफरल नीति',
    'register.btn.next': 'आगे',
    'register.btn.back': 'पीछे',
    'register.btn.submit': 'पंजीकरण पूर्ण करें',
    'register.btn.submitting': 'पंजीकरण हो रहा है...',
    'register.alreadyRegistered': 'पहले से पंजीकृत हैं?',
    'register.loginHere': 'यहां लॉगिन करें',
    'register.examFee': 'परीक्षा सहयोग राशि',

    // Login Page
    'login.title': 'छात्र लॉगिन',
    'login.subtitle': 'अपने छात्रवृत्ति परीक्षा डैशबोर्ड तक पहुंचें',
    'login.field.email': 'ईमेल पता',
    'login.field.mobile': 'मोबाइल नंबर',
    'login.btn.login': 'लॉगिन',
    'login.btn.loggingIn': 'लॉगिन हो रहा है...',
    'login.noAccount': 'खाता नहीं है?',
    'login.registerNow': 'अभी पंजीकरण करें',

    // Dashboard
    'dashboard.welcome': 'स्वागत है',
    'dashboard.overview': 'अवलोकन',
    'dashboard.examStatus': 'परीक्षा स्थिति',
    'dashboard.wallet': 'वॉलेट',
    'dashboard.results': 'परिणाम',
    'dashboard.certificates': 'प्रमाणपत्र',
    'dashboard.takeExam': 'परीक्षा दें',
    'dashboard.payFee': 'शुल्क भुगतान करें',
    'dashboard.pendingPayment': 'भुगतान बाकी',
    'dashboard.examCompleted': 'परीक्षा पूर्ण',
    'dashboard.viewResults': 'परिणाम देखें',
    'dashboard.downloadCertificate': 'प्रमाणपत्र डाउनलोड करें',

    // Admin
    'admin.dashboard': 'एडमिन डैशबोर्ड',
    'admin.students': 'छात्र',
    'admin.payments': 'भुगतान',
    'admin.scholarships': 'छात्रवृत्ति',
    'admin.certificates': 'प्रमाणपत्र',
    'admin.settings': 'सेटिंग्स',
    'admin.referrals': 'सेंटरकोड',
    'admin.emails': 'ईमेल',
    'admin.totalStudents': 'कुल छात्र',
    'admin.totalRevenue': 'कुल आय',
    'admin.examsCompleted': 'परीक्षाएं पूर्ण',
    'admin.pendingApprovals': 'लंबित अनुमोदन',
    'admin.analytics': 'विश्लेषण',
    'admin.registrationTrends': 'पंजीकरण रुझान',
    'admin.revenueTrends': 'राजस्व रुझान',
    'admin.classWiseDistribution': 'कक्षावार वितरण',
    'admin.referralStats': 'रेफरल आंकड़े',

    // Center Registration
    'center.register.title': 'अपना केंद्र पंजीकृत करें',
    'center.register.subtitle': 'अनुमोदित परीक्षा केंद्र बनने के लिए आवेदन करें',
    'center.details': 'केंद्र विवरण',
    'center.ownerInfo': 'स्वामी की जानकारी',
    'center.address': 'केंद्र का पता',
    'center.documents': 'दस्तावेज़',
    'center.field.centerName': 'केंद्र का नाम',
    'center.field.centerType': 'केंद्र का प्रकार',
    'center.field.ownerName': 'स्वामी का नाम',
    'center.field.ownerPhone': 'स्वामी का फोन',
    'center.field.ownerEmail': 'स्वामी का ईमेल',
    'center.field.address': 'पूरा पता',
    'center.field.city': 'शहर',
    'center.field.pincode': 'पिनकोड',
    'center.field.idProof': 'पहचान प्रमाण',
    'center.field.userPhoto': 'उपयोगकर्ता फोटो',
    'center.submit': 'आवेदन जमा करें',
    'center.submitting': 'जमा हो रहा है...',
    'center.terms': 'मैं केंद्र साझेदारी नियम और शर्तों से सहमत हूं',

    // Email
    'email.registration.subject': 'पंजीकरण सफल - जीपीएचडीएम छात्रवृत्ति परीक्षा',
    'email.payment.subject': 'भुगतान पुष्टि - जीपीएचडीएम',
    'email.examReminder.subject': 'परीक्षा अनुस्मारक - जीपीएचडीएम छात्रवृत्ति परीक्षा',
    'email.result.subject': 'आपके परिणाम उपलब्ध हैं - जीपीएचडीएम',
    'email.certificate.subject': 'प्रमाणपत्र जारी - जीपीएचडीएम छात्रवृत्ति परीक्षा',

    // Common Actions
    'action.save': 'सहेजें',
    'action.cancel': 'रद्द करें',
    'action.delete': 'हटाएं',
    'action.edit': 'संपादित करें',
    'action.view': 'देखें',
    'action.download': 'डाउनलोड',
    'action.submit': 'जमा करें',
    'action.confirm': 'पुष्टि करें',
    'action.approve': 'स्वीकृत',
    'action.reject': 'अस्वीकृत',
    'action.search': 'खोजें',
    'action.filter': 'फ़िल्टर',
    'action.export': 'निर्यात',
    'action.import': 'आयात',

    // Status
    'status.pending': 'लंबित',
    'status.approved': 'स्वीकृत',
    'status.rejected': 'अस्वीकृत',
    'status.active': 'सक्रिय',
    'status.blocked': 'अवरुद्ध',
    'status.success': 'सफल',
    'status.failed': 'विफल',
    'status.sent': 'भेजा गया',
    'status.delivered': 'वितरित',

    // Contact
    'contact.title': 'संपर्क करें',
    'contact.subtitle': 'हमारी टीम से संपर्क करें',
    'contact.form.name': 'आपका नाम',
    'contact.form.email': 'आपका ईमेल',
    'contact.form.phone': 'आपका फोन',
    'contact.form.message': 'आपका संदेश',
    'contact.form.submit': 'संदेश भेजें',
    'contact.office': 'कार्यालय का पता',
    'contact.hours': 'कार्य समय',
    'contact.faq': 'अक्सर पूछे जाने वाले प्रश्न',

    // Verification
    'verify.title': 'प्रमाणपत्र सत्यापन',
    'verify.subtitle': 'जीपीएचडीएम प्रमाणपत्रों की प्रामाणिकता सत्यापित करें',
    'verify.enterCode': 'प्रमाणपत्र आईडी दर्ज करें',
    'verify.btn': 'सत्यापित करें',
    'verify.valid': 'वैध प्रमाणपत्र',
    'verify.invalid': 'अमान्य प्रमाणपत्र',

    // Footer
    'footer.quickLinks': 'त्वरित लिंक',
    'footer.contactUs': 'संपर्क करें',
    'footer.terms': 'सेवा की शर्तें',
    'footer.privacy': 'गोपनीयता नीति',
    'footer.rights': 'सर्वाधिकार सुरक्षित',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('gphdm_language');
    return (saved as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('gphdm_language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
