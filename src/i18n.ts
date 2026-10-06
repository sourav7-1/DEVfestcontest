import type { Lang } from './lib/types';

const en = {
  'app.name': 'Tender Document Package Builder',
  'app.short': 'Tender Package Builder',
  'app.privacy': 'Your files never leave this computer',
  'lang.label': 'Language',

  'step.1': 'Load requirements',
  'step.2': 'Upload PDFs',
  'step.3': 'Match & check',
  'step.4': 'Generate',
  'step.done': 'Done',
  'step.current': 'Current step',
  'step.nav': 'Progress steps',
  'step.need_req': 'Load the tender’s requirements.json first.',
  'step.need_files': 'Upload at least one PDF first.',
  'step.coming': 'Matching and package generation are coming in the next step of the build.',

  'hero.title': 'Put together a complete tender package, one checklist at a time',
  'hero.lead': 'Start with the requirements file you received with the tender. We’ll show you exactly which documents are needed.',
  'hero.drop': 'Drop requirements.json here or click to choose',
  'hero.drop_active': 'Release to load the requirements',
  'hero.drop_hint': 'Only the .json file from the tender. Nothing is uploaded.',
  'hero.how': 'How it works',
  'hero.how1': 'Load the requirements file to see the document checklist.',
  'hero.how2': 'Add the PDFs you have — drop many at once.',
  'hero.how3': 'Match each PDF to a requirement and enter expiry dates.',
  'hero.how4': 'Download one ordered PDF with a cover page.',
  'hero.choose': 'Choose file',

  'err.title': 'This requirements file can’t be used',
  'err.json_syntax': 'The file is not valid JSON. Check for a missing comma or bracket. ({detail})',
  'err.json_not_object': 'The file should contain one JSON object with tender details and a "requirements" list.',
  'err.missing_field': 'The field "{field}" is missing.',
  'err.bad_deadline': 'The submission deadline is missing or not a valid date (expected YYYY-MM-DD).',
  'err.no_requirements': 'No requirements found. The file needs a non-empty "requirements" list.',
  'err.req_invalid': 'Requirement #{n} is not a valid entry.',
  'err.req_dup_id': 'Two requirements share the same id "{id}". Each id must be unique.',
  'err.req_order': 'Requirement "{id}" (#{n}) has no valid "order" number.',
  'err.req_title': 'Requirement "{id}" (#{n}) has no title.',
  'err.read': 'The file could not be read. Try choosing it again.',
  'err.not_json': 'Please choose the .json requirements file, not "{name}".',

  'tender.summary': 'Tender summary',
  'tender.id': 'Tender ID',
  'tender.title': 'Title',
  'tender.entity': 'Procuring entity',
  'tender.bidder': 'Bidder',
  'tender.deadline': 'Submission deadline',
  'tender.days_left': '{n} days left',
  'tender.day_left': '1 day left',
  'tender.today': 'Due today',
  'tender.passed': 'Deadline passed',
  'tender.replace': 'Load a different file',
  'tender.not_given': 'Not given',

  'req.heading': 'Required documents',
  'req.count': '{n} documents, in submission order',
  'req.mandatory': 'Mandatory',
  'req.optional': 'Optional',
  'req.expiry': 'Expiry checked',
  'req.order': 'Order {n}',

  'files.heading': 'Uploaded files',
  'files.count': '{n} of {max} files · {size} of 50 MB',
  'files.drop': 'Drop PDFs here',
  'files.drop_active': 'Release to add these files',
  'files.drop_hint': 'Add many at once. Up to 30 files, 50 MB in total.',
  'files.choose': 'Choose files',
  'files.empty': 'No files yet. Add the PDFs you have collected for this tender.',
  'files.reading': 'Reading {n} file(s)…',
  'files.pages': '{n} pages',
  'files.page': '1 page',
  'files.remove': 'Remove {name}',
  'files.dismiss': 'Dismiss {name}',
  'files.rejected': 'Not added',
  'files.same_as': 'Same content as {name}',
  'files.clear_rejected': 'Clear rejected',

  'ferr.not_pdf': 'Not a real PDF — the file content is a different type, even if the name ends in .pdf.',
  'ferr.corrupt': 'This PDF is damaged and can’t be opened. Ask for a fresh copy.',
  'ferr.encrypted': 'This PDF is password-protected. Save an unlocked copy and add it again.',
  'ferr.limit': 'Not added: the 30-file / 50 MB limit was reached.',
  'ferr.short.not_pdf': 'Not a PDF',
  'ferr.short.corrupt': 'Damaged',
  'ferr.short.encrypted': 'Password-protected',
  'ferr.short.limit': 'Over limit',

  'status.ok': 'Ready',
  'status.missing': 'Missing',
  'status.expired': 'Expired',
  'status.expiry_needed': 'Expiry date needed',
  'status.not_provided': 'Not provided',
  'status.duplicate': 'Duplicate',
  'status.error': 'Problem',

  'bar.progress': '{done} of {total} ready',
  'bar.problems': '{n} problems',
  'bar.problem': '1 problem',
  'bar.no_problems': 'No problems found',
  'bar.generate': 'Generate package',
  'bar.generate_hint': 'Match every mandatory document first.',

  'toast.req_loaded': 'Requirements loaded: {n} documents for tender {id}',
  'toast.req_failed': 'Couldn’t load the requirements file',
  'toast.files_added': '{n} file(s) added',
  'toast.files_rejected': '{n} file(s) couldn’t be used — see the reasons in the list',
  'toast.limit_count': 'Only 30 files are allowed. {n} file(s) were not added.',
  'toast.limit_size': 'Total size can’t go over 50 MB. {n} file(s) were not added.',
  'toast.duplicate': '“{a}” has the same content as “{b}”',
  'toast.removed': 'Removed {name}',
  'toast.lang': 'Language changed to English',
} as const;

export type Key = keyof typeof en;

const bn: Record<Key, string> = {
  'app.name': 'টেন্ডার ডকুমেন্ট প্যাকেজ বিল্ডার',
  'app.short': 'টেন্ডার প্যাকেজ বিল্ডার',
  'app.privacy': 'আপনার ফাইল এই কম্পিউটারের বাইরে কোথাও যায় না',
  'lang.label': 'ভাষা',

  'step.1': 'চাহিদাপত্র লোড',
  'step.2': 'পিডিএফ যোগ',
  'step.3': 'মিলিয়ে যাচাই',
  'step.4': 'প্যাকেজ তৈরি',
  'step.done': 'সম্পন্ন',
  'step.current': 'চলতি ধাপ',
  'step.nav': 'কাজের ধাপসমূহ',
  'step.need_req': 'আগে টেন্ডারের requirements.json ফাইলটি লোড করুন।',
  'step.need_files': 'আগে অন্তত একটি পিডিএফ যোগ করুন।',
  'step.coming': 'মেলানো ও প্যাকেজ তৈরির অংশ পরের ধাপে যুক্ত হবে।',

  'hero.title': 'একটি একটি করে মিলিয়ে নিন, পুরো টেন্ডার প্যাকেজ তৈরি হয়ে যাবে',
  'hero.lead': 'টেন্ডারের সাথে পাওয়া requirements ফাইলটি দিয়ে শুরু করুন। কোন কোন কাগজ লাগবে, আমরা তা পরিষ্কার দেখিয়ে দেব।',
  'hero.drop': 'requirements.json এখানে টেনে আনুন অথবা ক্লিক করে বেছে নিন',
  'hero.drop_active': 'ছেড়ে দিন, চাহিদাপত্র লোড হবে',
  'hero.drop_hint': 'শুধু টেন্ডারের .json ফাইল। কিছুই অনলাইনে পাঠানো হয় না।',
  'hero.how': 'কীভাবে কাজ করে',
  'hero.how1': 'চাহিদাপত্র লোড করলে প্রয়োজনীয় কাগজের তালিকা দেখবেন।',
  'hero.how2': 'আপনার কাছে থাকা পিডিএফগুলো যোগ করুন — একসাথে অনেকগুলো দেওয়া যায়।',
  'hero.how3': 'প্রতিটি পিডিএফ সঠিক কাগজের সাথে মিলিয়ে মেয়াদ শেষের তারিখ দিন।',
  'hero.how4': 'কভার পেজসহ সাজানো একটি পিডিএফ ডাউনলোড করুন।',
  'hero.choose': 'ফাইল বেছে নিন',

  'err.title': 'এই চাহিদাপত্র ফাইলটি ব্যবহার করা যাচ্ছে না',
  'err.json_syntax': 'ফাইলটি সঠিক JSON নয়। কোনো কমা বা ব্র্যাকেট বাদ পড়েছে কি না দেখুন। ({detail})',
  'err.json_not_object': 'ফাইলে টেন্ডারের তথ্য ও "requirements" তালিকাসহ একটি JSON অবজেক্ট থাকতে হবে।',
  'err.missing_field': '"{field}" তথ্যটি নেই।',
  'err.bad_deadline': 'জমার শেষ তারিখ নেই বা সঠিক নয় (YYYY-MM-DD আকারে দিতে হবে)।',
  'err.no_requirements': 'কোনো চাহিদা পাওয়া যায়নি। "requirements" তালিকাটি খালি রাখা যাবে না।',
  'err.req_invalid': '#{n} নম্বর চাহিদাটি সঠিকভাবে লেখা নেই।',
  'err.req_dup_id': 'দুটি চাহিদার id একই ("{id}")। প্রতিটি id আলাদা হতে হবে।',
  'err.req_order': '"{id}" (#{n}) চাহিদার সঠিক "order" নম্বর নেই।',
  'err.req_title': '"{id}" (#{n}) চাহিদার কোনো শিরোনাম নেই।',
  'err.read': 'ফাইলটি পড়া গেল না। আবার বেছে নিয়ে চেষ্টা করুন।',
  'err.not_json': '"{name}" নয়, .json চাহিদাপত্র ফাইলটি বেছে নিন।',

  'tender.summary': 'টেন্ডারের সারসংক্ষেপ',
  'tender.id': 'টেন্ডার আইডি',
  'tender.title': 'শিরোনাম',
  'tender.entity': 'ক্রয়কারী প্রতিষ্ঠান',
  'tender.bidder': 'দরদাতা',
  'tender.deadline': 'জমার শেষ তারিখ',
  'tender.days_left': 'আর {n} দিন বাকি',
  'tender.day_left': 'আর ১ দিন বাকি',
  'tender.today': 'আজই শেষ দিন',
  'tender.passed': 'শেষ তারিখ পেরিয়ে গেছে',
  'tender.replace': 'অন্য ফাইল লোড করুন',
  'tender.not_given': 'উল্লেখ নেই',

  'req.heading': 'প্রয়োজনীয় কাগজপত্র',
  'req.count': 'মোট {n}টি কাগজ, জমার ক্রম অনুযায়ী',
  'req.mandatory': 'বাধ্যতামূলক',
  'req.optional': 'ঐচ্ছিক',
  'req.expiry': 'মেয়াদ যাচাই হবে',
  'req.order': 'ক্রম {n}',

  'files.heading': 'যোগ করা ফাইল',
  'files.count': '{max}টির মধ্যে {n}টি ফাইল · ৫০ MB-এর মধ্যে {size}',
  'files.drop': 'পিডিএফগুলো এখানে টেনে আনুন',
  'files.drop_active': 'ছেড়ে দিন, ফাইলগুলো যোগ হবে',
  'files.drop_hint': 'একসাথে অনেকগুলো দিতে পারেন। সর্বোচ্চ ৩০টি ফাইল, মোট ৫০ MB।',
  'files.choose': 'ফাইল বেছে নিন',
  'files.empty': 'এখনো কোনো ফাইল নেই। এই টেন্ডারের জন্য সংগ্রহ করা পিডিএফগুলো যোগ করুন।',
  'files.reading': '{n}টি ফাইল পড়া হচ্ছে…',
  'files.pages': '{n} পৃষ্ঠা',
  'files.page': '১ পৃষ্ঠা',
  'files.remove': '{name} সরিয়ে দিন',
  'files.dismiss': '{name} তালিকা থেকে সরান',
  'files.rejected': 'যোগ হয়নি',
  'files.same_as': '{name}-এর সাথে হুবহু এক',
  'files.clear_rejected': 'বাতিলগুলো সরান',

  'ferr.not_pdf': 'এটি আসল পিডিএফ নয় — নাম .pdf হলেও ভেতরের ফাইলটি অন্য ধরনের।',
  'ferr.corrupt': 'পিডিএফটি নষ্ট, খোলা যাচ্ছে না। নতুন একটি কপি চেয়ে নিন।',
  'ferr.encrypted': 'পিডিএফটি পাসওয়ার্ড দিয়ে লক করা। লক খোলা কপি সেভ করে আবার যোগ করুন।',
  'ferr.limit': 'যোগ হয়নি: ৩০টি ফাইল / ৫০ MB-এর সীমা পূর্ণ।',
  'ferr.short.not_pdf': 'পিডিএফ নয়',
  'ferr.short.corrupt': 'নষ্ট ফাইল',
  'ferr.short.encrypted': 'পাসওয়ার্ড দেওয়া',
  'ferr.short.limit': 'সীমার বাইরে',

  'status.ok': 'প্রস্তুত',
  'status.missing': 'পাওয়া যায়নি',
  'status.expired': 'মেয়াদোত্তীর্ণ',
  'status.expiry_needed': 'মেয়াদের তারিখ দিন',
  'status.not_provided': 'দেওয়া হয়নি',
  'status.duplicate': 'একই ফাইল দুবার',
  'status.error': 'সমস্যা আছে',

  'bar.progress': '{total}টির মধ্যে {done}টি প্রস্তুত',
  'bar.problems': '{n}টি সমস্যা',
  'bar.problem': '১টি সমস্যা',
  'bar.no_problems': 'কোনো সমস্যা নেই',
  'bar.generate': 'প্যাকেজ তৈরি করুন',
  'bar.generate_hint': 'আগে সব বাধ্যতামূলক কাগজ মিলিয়ে নিন।',

  'toast.req_loaded': 'চাহিদাপত্র লোড হয়েছে: টেন্ডার {id}-এর জন্য {n}টি কাগজ',
  'toast.req_failed': 'চাহিদাপত্র ফাইলটি লোড করা যায়নি',
  'toast.files_added': '{n}টি ফাইল যোগ হয়েছে',
  'toast.files_rejected': '{n}টি ফাইল ব্যবহার করা যাচ্ছে না — তালিকায় কারণ দেখুন',
  'toast.limit_count': 'সর্বোচ্চ ৩০টি ফাইল দেওয়া যায়। {n}টি ফাইল যোগ হয়নি।',
  'toast.limit_size': 'মোট আকার ৫০ MB-এর বেশি হতে পারবে না। {n}টি ফাইল যোগ হয়নি।',
  'toast.duplicate': '“{a}” আর “{b}” হুবহু একই ফাইল',
  'toast.removed': '{name} সরানো হয়েছে',
  'toast.lang': 'ভাষা বাংলায় বদলানো হয়েছে',
};

export const dict: Record<Lang, Record<Key, string>> = { en, bn };

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export const localizeDigits = (s: string, lang: Lang) =>
  lang === 'bn' ? s.replace(/\d/g, (d) => BN_DIGITS[+d]) : s;

export function translate(lang: Lang, key: Key, params: Record<string, string | number> = {}): string {
  return dict[lang][key].replace(/\{(\w+)\}/g, (_, k: string) =>
    k in params ? (typeof params[k] === 'number' ? localizeDigits(String(params[k]), lang) : String(params[k])) : `{${k}}`,
  );
}

const LS_KEY = 'tpb.lang';
export function loadLang(): Lang {
  try {
    return localStorage.getItem(LS_KEY) === 'bn' ? 'bn' : 'en';
  } catch {
    return 'en';
  }
}
export function saveLang(lang: Lang) {
  try {
    localStorage.setItem(LS_KEY, lang);
  } catch {
    /* private mode: ignore */
  }
}
