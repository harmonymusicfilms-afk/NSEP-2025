import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Award,
  Users,
  CheckCircle,
  ArrowRight,
  Clock,
  Shield,
  BookOpen,
  Trophy,
  BadgeCheck,
  IndianRupee,
  Share2,
  Gift,
  Bell,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { APP_CONFIG, EXAM_CONFIG, getExamFee, SCHOLARSHIP_CONFIG, REFERRAL_CONFIG } from '@/constants/config';
import { formatCurrency, getOrdinal } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useExamStore } from '@/stores';

import heroImg from '@/assets/hero-scholarship.jpg';

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
} as const;

const itemVariants: any = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 100 }
  }
} as const;

export function HomePage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { config, loadExamData } = useExamStore();
  const prizes = config.scholarshipAmounts || SCHOLARSHIP_CONFIG.defaultAmounts;

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      console.log('Redirecting to registration with referral code:', refCode);
      navigate(`/register?ref=${refCode}`);
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    loadExamData();
  }, [loadExamData]);

  const handleNotify = () => {
    toast({
      title: "Updates Enabled",
      description: "You will be notified about upcoming exams and results.",
    });
  };

  const features = [
    {
      icon: BookOpen,
      title: 'Class 1-12 Coverage',
      description: 'Comprehensive examination for all school levels with age-appropriate questions',
    },
    {
      icon: Clock,
      title: 'Timed Assessment',
      description: `${EXAM_CONFIG.totalQuestions} questions with ${EXAM_CONFIG.defaultTimePerQuestion}s per question, testing quick thinking`,
    },
    {
      icon: Trophy,
      title: 'Merit-Based Rankings',
      description: 'Class-wise rankings based on score, accuracy, and time taken',
    },
    {
      icon: Award,
      title: 'Scholarship Awards',
      description: 'Top 100 ranks eligible for scholarships in every class',
    },
    {
      icon: BadgeCheck,
      title: 'Verified Certificates',
      description: 'QR-coded certificates with public verification system',
    },
    {
      icon: Shield,
      title: 'Secure & Fair',
      description: 'One attempt per student with strict fraud prevention measures',
    },
  ];

  const feeStructure = [
    { classes: '1-5', label: 'Primary', fee: getExamFee(1), color: 'bg-blue-50' },
    { classes: '6-8', label: 'Middle', fee: getExamFee(6), color: 'bg-green-50' },
    { classes: '9-12', label: 'Senior', fee: getExamFee(9), color: 'bg-purple-50' },
  ];

  const steps = [
    { step: 1, title: 'Register', description: 'Create your account using a Center Referral Code' },
    { step: 2, title: 'Pay Fee', description: 'Complete secure payment via QR code' },
    { step: 3, title: 'Take Exam', description: 'Attempt the timed examination' },
    { step: 4, title: 'Get Results', description: 'View rank and receive certificate' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-primary/5 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative py-20 z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="flex flex-col gap-8 text-center lg:text-left"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center justify-center lg:justify-start gap-3 self-center lg:self-start rounded-full bg-primary/10 border border-primary/20 px-6 py-3">
                <Sparkles className="size-5 text-primary animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary">
                  {t('home.registration.open')} {APP_CONFIG.year}
                </span>
              </motion.div>

              <motion.h1 variants={itemVariants} className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight text-foreground">
                {t('home.hero.title')}
              </motion.h1>

              <motion.div variants={itemVariants} className="space-y-4">
                <p className="text-xl sm:text-2xl font-bold text-primary">
                  {t('home.hero.missionLine')}
                </p>
                <p className="text-lg sm:text-xl font-semibold text-accent uppercase tracking-wide">
                  EXAMINATION MANAGED BY S.V. MEDIA FILMS PRODUCTION
                </p>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0">
                  {t('home.hero.subtitle')}
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 mt-4 justify-center lg:justify-start">
                <Link to="/register">
                  <Button size="lg" className="h-14 px-10 bg-primary text-white text-lg font-bold group hover:bg-primary/90 rounded-lg">
                    {t('home.hero.registerBtn')}
                    <ArrowRight className="ml-2 size-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 border-border text-foreground text-lg font-medium rounded-lg"
                  onClick={() => window.open(APP_CONFIG.notificationGroupUrl, '_blank')}
                >
                  <Bell className="size-5 text-primary mr-2" />
                  {language === 'hi' ? 'अपडेट' : 'Updates'}
                </Button>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:block relative"
            >
              <div className="relative z-10 aspect-[4/5] rounded-2xl overflow-hidden border border-border shadow-lg">
                <img
                  src={heroImg}
                  alt="National Scholarship Excellence"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Floating Cards */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -left-16 top-1/4 bg-background rounded-xl p-6 shadow-lg border border-border z-20"
              >
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="size-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">50K+</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Students</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -right-12 bottom-1/4 bg-background rounded-xl p-6 shadow-lg border border-border z-20"
              >
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Trophy className="size-6 text-accent" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">₹25L+</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Rewards</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-secondary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              {t('home.features.title')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('home.features.subtitle')} Experience a next-generation platform designed for excellence.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="group relative"
              >
                <div className="bg-background p-8 rounded-xl border border-border hover:border-primary/30 hover:shadow-lg transition-all h-full">
                  <div className="size-14 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                    <feature.icon className="size-7 text-primary" />
                  </div>
                  <h3 className="font-bold text-xl mb-3 text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Fee Structure */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-primary mb-4">
              {t('home.fees.title')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('home.fees.subtitle')} Accessible intelligence assessment for everyone.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {feeStructure.map((item, i) => (
              <motion.div
                key={item.classes}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className={`${item.color} p-8 rounded-xl text-center border border-border`}
              >
                <div className="inline-flex size-16 rounded-lg bg-background border border-border mb-6 items-center justify-center">
                  <IndianRupee className="size-8 text-primary" />
                </div>
                <div className="text-sm font-bold text-primary uppercase tracking-wide mb-2">
                  {item.label}
                </div>
                <div className="text-xl font-bold text-foreground mb-4">
                  Class {item.classes}
                </div>
                <div className="text-4xl font-bold text-foreground">
                  {formatCurrency(item.fee)}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-20 bg-secondary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              {t('home.howItWorks.title')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('home.howItWorks.subtitle')} Start your journey to excellence in 4 simple steps.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className="relative"
              >
                <div className="bg-background rounded-xl p-8 text-center border border-border h-full">
                  <div className="size-16 rounded-lg bg-primary flex items-center justify-center text-white text-2xl font-bold mb-6 mx-auto">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-xl mb-3 text-foreground">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Scholarship Rewards Category Section */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              {language === 'hi' ? 'छात्रवृत्ति पुरस्कार श्रेणियाँ' : 'Scholarship Rewards By Category'}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {language === 'hi' 
                ? 'प्रत्येक श्रेणी के लिए आकर्षक छात्रवृत्ति राशि।' 
                : 'Attractive scholarship amounts across all educational categories.'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                category: 'Primary', 
                classes: '1-5', 
                range: '₹2,000 - ₹10,000', 
                ranks: '100+ Ranks',
                color: 'from-blue-500/10 to-blue-600/5',
                border: 'border-blue-200',
                text: 'text-blue-700'
              },
              { 
                category: 'Junior', 
                classes: '6-8', 
                range: '₹2,500 - ₹12,000', 
                ranks: '100+ Ranks',
                color: 'from-green-500/10 to-green-600/5',
                border: 'border-green-200',
                text: 'text-green-700'
              },
              { 
                category: 'Senior', 
                classes: '9-12', 
                range: '₹3,000 - ₹15,000', 
                ranks: '100+ Ranks',
                color: 'from-purple-500/10 to-purple-600/5',
                border: 'border-purple-200',
                text: 'text-purple-700'
              }
            ].map((item, i) => (
              <motion.div
                key={item.category}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`flex flex-col p-8 rounded-2xl border ${item.border} bg-gradient-to-br ${item.color} shadow-sm group hover:shadow-md transition-all`}
              >
                <div className="mb-4">
                  <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white border ${item.border} ${item.text}`}>
                    Class {item.classes}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">{item.category}</h3>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-white/50">
                    <span className="text-muted-foreground">Scholarship Range:</span>
                    <span className={`font-bold text-lg ${item.text}`}>{item.range}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Eligible Positions:</span>
                    <span className="font-semibold text-foreground">{item.ranks}</span>
                  </div>
                </div>
                <div className="mt-8">
                  <Link to="/register">
                    <Button className={`w-full font-bold group ${item.category === 'Primary' ? 'bg-blue-600 hover:bg-blue-700' : item.category === 'Junior' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                      Enrol Now
                      <ArrowRight className="ml-2 size-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Rewards Section */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-3 bg-primary/10 rounded-full px-6 py-3 text-primary font-bold tracking-wide text-xs mb-8 border border-primary/20">
                <Share2 className="size-4" />
                <span>PARTNERSHIP PROGRAM</span>
              </div>

              <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
                {t('home.centerCode.title')}
              </h2>

              <p className="text-lg text-muted-foreground mb-10">
                {t('home.centerCode.subtitle')} Transform your institute into an excellence hub.
              </p>

              <div className="space-y-6 mb-10">
                {[
                  { icon: IndianRupee, title: 'Center Rewards', val: REFERRAL_CONFIG.centerCodeReward, text: 'text-primary', bg: 'bg-primary/10' },
                  { icon: Shield, title: 'Admin Rewards', val: REFERRAL_CONFIG.adminCenterReward, text: 'text-accent', bg: 'bg-accent/10' }
                ].map((reward, i) => (
                  <div key={i} className="flex items-center gap-6 bg-secondary/20 p-6 rounded-xl border border-border">
                    <div className={`size-14 ${reward.bg} rounded-lg flex items-center justify-center`}>
                      <reward.icon className={`size-7 ${reward.text}`} />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-foreground mb-1">{reward.title}</h4>
                      <p className="text-muted-foreground">
                        Earn <strong className={`${reward.text} text-xl font-bold px-1`}>{formatCurrency(reward.val)}</strong> per referral
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-4">
                <Link to="/center-registration">
                  <Button size="lg" className="h-14 px-8 bg-primary text-white rounded-lg font-bold text-lg">
                    <Gift className="size-5 mr-2" />
                    {language === 'hi' ? 'रजिस्टर करें' : 'Register Center'}
                  </Button>
                </Link>
                <Link to="/about">
                  <Button size="lg" variant="outline" className="h-14 px-8 rounded-lg font-medium text-lg border-gray-300">
                    Details
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-secondary/10 rounded-xl p-8 lg:p-10 border border-border"
            >
              <h3 className="text-2xl font-bold mb-8 text-center text-foreground uppercase tracking-wide">How it works</h3>
              <div className="space-y-8">
                {[
                  { step: 1, title: 'Apply Now', desc: 'Become an approved partner' },
                  { step: 2, title: 'Access Code', desc: 'Get your unique CC ID' },
                  { step: 3, title: 'Share & Grow', desc: 'Refer students securely' },
                  { step: 4, title: 'Earn Legacy', desc: 'Instant payouts per student' },
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-6">
                    <div className="size-12 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-lg">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-foreground">{item.title}</h4>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Prize Pool */}
      <section className="py-20 bg-secondary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              {t('home.scholarship.title')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('home.scholarship.subtitle')} Our elite scholars are deeply rewarded.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {SCHOLARSHIP_CONFIG.eligibleRanks.slice(0, 5).map((rank) => {
              const colors = {
                1: 'bg-accent/20 border-accent/50',
                2: 'bg-primary/20 border-primary/50',
                3: 'bg-accent/10 border-accent/30',
                others: 'bg-background border-border'
              };
              const color = rank === 1 ? colors[1] : rank === 2 ? colors[2] : rank === 3 ? colors[3] : colors.others;

              return (
                <motion.div
                  key={rank}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: rank * 0.1 }}
                  className={`${color} rounded-xl p-6 text-center border`}
                >
                  <div className="inline-flex size-14 rounded-lg bg-primary/10 items-center justify-center mb-4">
                    <Trophy className="size-7 text-primary" />
                  </div>
                  <div className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-2">
                    {getOrdinal(rank)} Rank
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {formatCurrency(prizes[rank] || 0)}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              {t('home.cta.title')}
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              {t('home.cta.subtitle')} Join millions of students participating nationwide.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register">
                <Button size="lg" className="h-14 px-10 bg-background text-primary hover:bg-secondary/80 rounded-lg text-lg font-bold">
                  {t('home.hero.registerBtn')}
                  <ArrowRight className="size-5 ml-2" />
                </Button>
              </Link>
              <Link to="/verify">
                <Button size="lg" variant="outline" className="h-14 px-10 border-white text-white hover:bg-white/10 rounded-lg text-lg font-medium">
                  <CheckCircle className="size-5 mr-2" />
                  {t('nav.verify')}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
