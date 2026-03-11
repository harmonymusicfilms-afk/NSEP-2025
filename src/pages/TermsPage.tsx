import { Link } from 'react-router-dom';
import {
  FileText,
  BookOpen,
  AlertTriangle,
  Scale,
  RefreshCw,
  Shield,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { APP_CONFIG, POLICY_CONFIG } from '@/constants/config';

export function TermsPage() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-primary hover:underline mb-4">
            <ArrowLeft className="size-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="size-7 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold text-foreground">
                Terms of Service
              </h1>
              <p className="text-muted-foreground">
                नियम एवं शर्तें
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>Version: {POLICY_CONFIG.termsVersion}</span>
            <span>•</span>
            <span>Last Updated: {POLICY_CONFIG.lastUpdated}</span>
            <span>•</span>
            <span>Effective Date: {POLICY_CONFIG.lastUpdated}</span>
          </div>
        </div>

        {/* Introduction */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <p className="text-muted-foreground leading-relaxed">
              Welcome to {APP_CONFIG.fullName} ({APP_CONFIG.shortName}). By accessing or using our platform,
              you agree to be bound by these Terms of Service. Please read them carefully before registering
              for the examination or using any of our services.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              {APP_CONFIG.organization} की वेबसाइट और सेवाओं का उपयोग करने से पहले कृपया इन नियमों और शर्तों को
              ध्यान से पढ़ें। पंजीकरण करके, आप इन सभी शर्तों से सहमत होते हैं।
            </p>
          </CardContent>
        </Card>

        {/* Section 1: Examination Rules */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <BookOpen className="size-5 text-primary" />
              1. Examination Rules (परीक्षा नियम)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">1.1 Eligibility Criteria (पात्रता मानदंड)</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Students from Class 1 to Class 12 are eligible to participate.</li>
                <li>Each student can register only once per academic year.</li>
                <li>The student must provide accurate information during registration.</li>
                <li>Minimum age requirement: 5 years for Class 1; age-appropriate for other classes.</li>
                <li>Students must have a valid Indian mobile number and email address.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">1.2 Examination Format (परीक्षा प्रारूप)</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>The examination consists of 60 multiple-choice questions.</li>
                <li>Each question carries 4 marks for correct answer.</li>
                <li>Negative marking: -4 marks for each wrong answer.</li>
                <li>Time allotted: 5-7 seconds per question (as per examination settings).</li>
                <li>Unanswered questions carry zero marks.</li>
                <li>One attempt per student - re-examination is not permitted.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">1.3 Passing Criteria (उत्तीर्ण मानदंड)</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>All students who complete the examination will receive a Participation Certificate.</li>
                <li>Merit Certificates are awarded to students scoring above 60%.</li>
                <li>Scholarship eligibility: Top 10 ranks in each class category.</li>
                <li>Minimum 50% attendance/completion required for certificate issuance.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">1.4 Result Declaration (परिणाम घोषणा)</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Results will be declared within 7-15 working days after examination closure.</li>
                <li>Results will be published on the student dashboard and sent via email.</li>
                <li>Class-wise rankings will be displayed based on score, accuracy, and time taken.</li>
                <li>Results once published are final and binding.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">1.5 Re-evaluation Rules (पुनर्मूल्यांकन नियम)</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Re-evaluation requests must be submitted within 7 days of result declaration.</li>
                <li>A non-refundable donation of ₹100 is applicable for re-evaluation.</li>
                <li>Re-evaluation will only cover technical or system errors.</li>
                <li>The decision of the evaluation committee is final.</li>
                <li>No re-examination or second attempt is permitted under any circumstances.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Refund Policy */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <RefreshCw className="size-5 text-green-600" />
              2. Refund Policy (धन वापसी नीति)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-800">Important Notice</h4>
                  <p className="text-sm text-yellow-700">
                    Registration donations are generally non-refundable. Please read the conditions below carefully
                    before making payment.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">2.1 Non-Refundable Conditions (अप्रतिदेय स्थितियां)</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Once registration donation is paid successfully, it is non-refundable.</li>
                <li>No refund after examination attempt (partial or complete).</li>
                <li>No refund for change of mind or duplicate registration.</li>
                <li>No refund for incorrect information provided during registration.</li>
                <li>No refund for disqualification due to malpractice.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">2.2 Refund Eligible Conditions (धन वापसी योग्य स्थितियां)</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Double payment due to technical error (with proof).</li>
                <li>Examination cancelled by {APP_CONFIG.shortName} administration.</li>
                <li>System failure preventing examination access (verified cases only).</li>
                <li>Payment processed but registration not completed due to system error.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">2.3 Refund Process (धन वापसी प्रक्रिया)</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Submit refund request via email to {APP_CONFIG.supportEmail} within 7 days.</li>
                <li>Include: Registration ID, Payment ID, Bank details, Reason for refund.</li>
                <li>Processing time: 15-30 working days after approval.</li>
                <li>Refund will be credited to the original payment method.</li>
                <li>Transaction charges (if any) will be deducted from refund amount.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Code of Conduct */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Shield className="size-5 text-blue-600" />
              3. Code of Conduct (आचार संहिता)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">3.1 Student Responsibilities (छात्र की जिम्मेदारियां)</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Provide accurate and truthful information during registration.</li>
                <li>Maintain confidentiality of login credentials.</li>
                <li>Attempt examination independently without external assistance.</li>
                <li>Use stable internet connection during examination.</li>
                <li>Report technical issues immediately through official channels.</li>
                <li>Respect intellectual property and examination content.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">3.2 Center Responsibilities (केंद्र की जिम्मेदारियां)</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Maintain ethical practices in student referrals.</li>
                <li>Provide accurate information about the examination program.</li>
                <li>Not guarantee scholarships or specific results to students.</li>
                <li>Support students with genuine queries and concerns.</li>
                <li>Report any fraudulent activities immediately.</li>
                <li>Maintain confidentiality of student information.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">3.3 Prohibited Activities (निषिद्ध गतिविधियां)</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <ul className="list-disc list-inside space-y-2 text-red-700">
                  <li>Sharing examination content or questions with others.</li>
                  <li>Using unauthorized devices or software during examination.</li>
                  <li>Creating multiple accounts or fake registrations.</li>
                  <li>Self-referral to earn referral rewards.</li>
                  <li>Impersonation or proxy examination attempts.</li>
                  <li>Manipulating or hacking examination system.</li>
                  <li>Spreading false information about {APP_CONFIG.shortName}.</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">3.4 Disciplinary Actions (अनुशासनात्मक कार्रवाई)</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Warning and account suspension for minor violations.</li>
                <li>Permanent ban and result cancellation for serious violations.</li>
                <li>Forfeiture of scholarships and rewards for fraud.</li>
                <li>Legal action for criminal activities as per Indian law.</li>
                <li>Blacklisting from future examinations.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Legal Disclaimers */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Scale className="size-5 text-purple-600" />
              4. Legal Disclaimers (कानूनी अस्वीकरण)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">4.1 Results Finality (परिणामों की अंतिमता)</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>All examination results are final and binding.</li>
                <li>The decision of the examination committee is conclusive.</li>
                <li>{APP_CONFIG.shortName} reserves the right to modify, cancel, or reschedule examinations.</li>
                <li>Rankings may be adjusted in case of identified malpractices.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">4.2 Authority Rights (प्राधिकरण के अधिकार)</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>{APP_CONFIG.organization} reserves all rights to modify terms without prior notice.</li>
                <li>The organization may update examination donations, Scholarship Amounts, and policies.</li>
                <li>User accounts may be suspended or terminated for policy violations.</li>
                <li>Content and intellectual property rights belong to {APP_CONFIG.shortName}.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">4.3 Jurisdiction (अधिकार क्षेत्र)</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <ul className="list-disc list-inside space-y-2 text-blue-800">
                  <li>These terms are governed by the laws of India.</li>
                  <li>All disputes shall be subject to the exclusive jurisdiction of courts in Uttar Pradesh, India.</li>
                  <li>Compliance with Information Technology Act, 2000 and related regulations.</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">4.4 Super Admin Authority (सुपर एडमिन प्राधिकार)</h3>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="size-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-purple-800 font-medium">
                      The decision of the Super Admin of {APP_CONFIG.shortName} is final and binding
                      in all matters related to the examination, scholarships, refunds, and disputes.
                    </p>
                    <p className="text-purple-700 text-sm mt-2">
                      सुपर एडमिन का निर्णय परीक्षा, छात्रवृत्ति, धन वापसी और विवादों से संबंधित
                      सभी मामलों में अंतिम और बाध्यकारी है।
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">4.5 Limitation of Liability (दायित्व की सीमा)</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>{APP_CONFIG.shortName} shall not be liable for indirect, incidental, or consequential damages.</li>
                <li>No liability for technical failures beyond reasonable control.</li>
                <li>Maximum liability limited to the registration donation paid.</li>
                <li>No warranty on Scholarship Amounts or result outcomes.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Referral Program Terms */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Shield className="size-5 text-orange-600" />
              5. Referral Program Terms (रेफरल कार्यक्रम की शर्तें)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Referral rewards are credited only after successful registration and payment.</li>
              <li>Admin Center referrals earn ₹25 per successful registration.</li>
              <li>Center Code referrals earn ₹50 per successful registration.</li>
              <li>Self-referrals are strictly prohibited and will result in account suspension.</li>
              <li>Referral rewards are subject to verification and may be revoked for fraudulent activity.</li>
              <li>Minimum wallet balance of ₹500 required for withdrawal.</li>
              <li>{APP_CONFIG.shortName} reserves the right to modify referral rewards without prior notice.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Contact & Acceptance */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Contact for Queries (प्रश्नों के लिए संपर्क)</h3>
            <p className="text-muted-foreground mb-4">
              For any questions regarding these Terms of Service, please contact:
            </p>
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <p><strong>Email:</strong> {APP_CONFIG.supportEmail}</p>
              <p><strong>Phone:</strong> {APP_CONFIG.supportPhone}</p>
              <p><strong>Organization:</strong> {APP_CONFIG.organization}</p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pb-8">
          <p>
            By registering on {APP_CONFIG.shortName}, you acknowledge that you have read, understood,
            and agree to be bound by these Terms of Service.
          </p>
          <p className="mt-2">
            © {new Date().getFullYear()} {APP_CONFIG.organization}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
