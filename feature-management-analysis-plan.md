# تقرير تحليل النظام وخطة تطوير Feature Management & Time Tracking

## 1. ملخص تنفيذي

هذا التقرير مبني على قراءة الكود الحالي في المشروع، وليس على افتراض أسماء Models أو جداول غير موجودة.

النتيجة الأساسية:

- المشروع الحالي مبني كتطبيق Next.js واحد يحتوي على الواجهة وRoute Handlers للـ API.
- قاعدة البيانات MongoDB، والتعامل معها يتم من خلال Mongoose.
- المشروع الأصلي محفوظ في Model اسمه `FreelanceProject`.
- الدفعات والأقساط والدعم محفوظة حاليًا في Model اسمه `Project`.
- لا يوجد حاليًا Model أو API أو UI مستقل للـ Features أو Tasks أو Time Tracking.
- لا يوجد Timer حقيقي محفوظ في الـ Backend حاليًا.
- زر **إضافة دعم** الحالي يسجل مبلغًا محصلًا فورًا، وبالتالي يزيد التقارير والـ Wallet مباشرة.
- زر **إضافة قسط** الحالي ينشئ صفًا غير محصل، ثم زر التحصيل يحوله إلى مبلغ محصل.

التصميم المقترح هو فصل ثلاثة أشياء بوضوح:

1. **Work Management:** Feature وTasks وحالة التنفيذ.
2. **Time Tracking:** جلسات الوقت، الوقت الفعلي، والوقت القابل للفوترة.
3. **Financial Management:** السعر المعتمد، المبالغ المستحقة، والدفعات الفعلية.

إنشاء Feature أو تسعيرها أو إكمالها يجب ألا يسجل دخلًا تلقائيًا. الدخل والـ Wallet يتغيران فقط عند إنشاء دفعة فعلية محصلة.

---

## 2. ما تم التأكد منه من الكود الحالي

### 2.1 الـ Tech Stack والـ Architecture

من `package.json` و`README.md`:

- Next.js `14.2.35` باستخدام App Router.
- React 18.
- TypeScript مع `strict: true`.
- MongoDB عبر Mongoose `9.5.0`.
- NextAuth مع Credentials Provider وJWT sessions.
- React Query لإدارة جلب البيانات والـ mutations في الواجهة.
- next-intl للغتين العربية والإنجليزية.
- Tailwind CSS ومكونات UI محلية مبنية على Base UI.
- Vitest للاختبارات الحالية.
- النشر الحالي مهيأ لـ Vercel من خلال `vercel.json`.

التطبيق Monolith:

```text
Next.js App Router
├── Pages / Client Components
├── Route Handlers تحت src/app/api
├── Services تحت src/lib/services
├── Mongoose Models تحت src/lib/models
└── MongoDB
```

لا يوجد Express Server منفصل ولا ORM آخر ولا نظام صلاحيات متعدد الأدوار. المستخدم الحالي هو صاحب البيانات، وكل Route تقريبًا يبدأ بـ `requireAuthUser()` ثم يقيّد الاستعلام بـ `userId`.

### 2.2 المصادقة والصلاحيات

المصادقة موجودة في:

- `src/lib/auth.ts`
- `src/lib/api-auth.ts`
- `src/middleware.ts`

النظام يعتمد على:

- NextAuth Credentials.
- JWT session.
- `session.user.id` مأخوذ من JWT.
- `requireAuthUser()` لإرجاع المستخدم أو HTTP 401.
- Middleware يمنع الوصول للصفحات المحمية إذا لم يوجد Token.

لا يوجد حاليًا Role/Permission system معقد. لذلك Feature وTask وTimeSession يجب أن تُربط بالمستخدم من خلال المشروع، مع التحقق دائمًا من السلسلة:

```text
userId → FreelanceProject → Feature → Task → TimeSession
```

لا يكفي قبول `featureId` أو `taskId` من الـ Client بدون التأكد أن الكيان تابع للمستخدم الحالي.

### 2.3 Models المتعلقة بالمشاريع والأموال

#### `FreelanceProject`

المسار: `src/lib/models/FreelanceProject.ts`

يمثل المشروع الأصلي ويحتوي حاليًا على:

- `userId`
- `name`
- `agreedAmount`
- `currency`
- `originalAmount`
- `exchangeRateToEgp`
- `status`: `pending | partial | collected | cancelled`
- `workPhase`: `quote | in_progress | delivered`
- `billingMode`: `fixed | retainer`
- `expectedPaymentMethod`
- `billingStatus`: `unbilled | billed`
- `invoiceId`
- `scopeItems`
- بيانات العميل والـ credentials والملاحظات والتواريخ.

المهم أن `workPhase` منفصل عن حالة التحصيل، لكن `billingMode=retainer` مستخدم حاليًا لتمييز المشاريع التي تقبل دعمًا أو دفعات إضافية.

#### `Project`

المسار: `src/lib/models/Project.ts`

هذا هو السجل المالي الفعلي للدفعات، ويحتوي على:

- `userId`
- `freelanceProjectId`
- `name`
- `amount`
- `date`
- `isCollected`
- `collectedAt`
- `paymentMethod`
- `note`
- `lineKind`: حاليًا `installment | support`

السجل القديم الذي لا يحتوي على `isCollected` يُعامل في بعض الاستعلامات كأنه محصل، للحفاظ على التوافق مع البيانات القديمة.

#### `Expense`

المسار: `src/lib/models/Expense.ts`

يمكن ربط المصروف بالمشروع بواسطة `freelanceProjectId` أو `projectName`. المصروفات تدخل في حساب `spentAmount` و`netCollected` داخل ملخص المشروع.

#### Models غير الموجودة

يوجد Models للدخل والمصاريف والأهداف والمحفظة والفواتير والتنبيهات، لكن لا يوجد أي Model حالي للآتي:

- Feature.
- Task.
- Time Session.
- Timer state.
- Audit Log.

### 2.4 تسجيل الأقساط الحالي

الوظائف الأساسية موجودة في:

- `src/app/api/project-jobs/route.ts`
- `src/app/api/project-jobs/[id]/route.ts`
- `src/lib/services/project-payout-service.ts`

عند إنشاء مشروع غير محصل:

- إذا تم إرسال Installments، يتم إنشاء صفوف `Project` بـ `isCollected=false`.
- إذا لم توجد Installments، يتم إنشاء صف واحد بعنوان `Pending collection`.

عند تنفيذ `action: "add_installment"`:

- يتم التحقق من المبلغ.
- في المشروع `fixed` لا يسمح النظام بتجاوز الرصيد المتبقي.
- يتم إنشاء `Project` جديد بـ `isCollected=false` و`lineKind` الافتراضي `installment`.
- يتم تشغيل `normalizePendingInstallments` ثم `syncJobStatus`.

عند تنفيذ `action: "collect"`:

- يمكن تحصيل صف Pending موجود بواسطة `payoutId`.
- أو إنشاء تحصيل جديد.
- يتحول السجل إلى `isCollected=true`.
- يتم تحديث `date` و`collectedAt` و`paymentMethod`.
- يتغير المشروع وحساباته بعد `syncJobStatus`.

إذن القسط المستقبلي لا يدخل دخل الشهر أو الـ Wallet، بينما التحصيل الفعلي يدخل الاثنين.

### 2.5 تسجيل الدعم الحالي

في:

- `src/app/api/project-jobs/[id]/route.ts`
- `src/app/[locale]/(dashboard)/projects/[id]/page.tsx`

العملية الحالية `action: "add_support"` تقوم بالآتي:

1. تقرأ المبلغ والتاريخ وطريقة الدفع والملاحظة.
2. تنشئ `Project` جديدًا بـ:
   - `lineKind: "support"`
   - `isCollected: true`
   - `collectedAt: date`
3. إذا لم يكن المشروع Retainer، تغيّر `billingMode` إلى `retainer`.
4. تستدعي `syncJobStatus`.

هذا يعني أن زر الدعم الحالي ليس زر إنشاء طلب عمل فقط؛ هو زر تسجيل فلوس محصلة. لذلك استخدامه لعمل خمس Features لم يتم دفعها بعد سيؤدي إلى خطأ مالي واضح:

- زيادة دخل المشروع.
- زيادة دخل الشهر.
- زيادة رصيد الكاش أو الفيزا.
- زيادة إجمالي الـ Ledger.

هذا السلوك يجب ألا يُستخدم لتسجيل Feature غير مدفوعة.

يوجد حاليًا في الـ Workspace تعديل سابق يسمح بتعديل وحذف سجلات الدعم من صفحة التفاصيل، من خلال `update_support` و`delete_support`. هذا مفيد للسجلات القديمة، لكنه لا يحل مشكلة أن الدعم الجديد يُسجل كمبلغ محصل فورًا.

### 2.6 أثر الدفعات على التقارير والأرصدة

#### التقرير الشهري

المسار: `src/lib/build-monthly-report.ts`

التقرير يجلب من `Project` باستخدام `projectPayoutInMonth`، وهذا الفلتر يشمل الصفوف المحصلة فقط.

كل صف محصل من `Project` يدخل تحت دخل المشاريع، بدون تمييز كامل حاليًا بين قسط المشروع الأصلي والدعم وأي نوع دفعة جديد.

#### الـ Ledger

المسار: `src/lib/build-ledger-report.ts`

يستخدم `projectCollectedFilter` ويجمع كل صف محصل من `Project` ضمن دخل المشروع.

#### الـ Wallet

المسار: `src/lib/services/wallet-service.ts`

يحسب تقريبًا:

```text
cash = openingCash + collected cash project payouts + cash income - cash expenses
card = openingCard + collected card project payouts + card income - card expenses
```

بالتالي، إعادة استخدام `Project` للدفعات الجديدة مناسب جدًا، بشرط أن تكون الدفعة غير المحصلة `isCollected=false` ولا تدخل التقارير أو الـ Wallet.

#### تقرير المشروع

المسار: `src/components/projects/project-period-report.tsx`

التقرير الحالي يقسم الدفعات المحصلة إلى:

- Installments: كل ما ليس `lineKind=support`.
- Support: كل ما هو `lineKind=support`.

عند إضافة Feature Payments يجب تعديل هذا التقسيم حتى لا تظهر كل دفعة Feature كأنها قسط أصلي.

### 2.7 واجهة المشروع الحالية

صفحة التفاصيل:

`src/app/[locale]/(dashboard)/projects/[id]/page.tsx`

حاليًا تعرض:

- ملخص المبلغ المتفق عليه.
- إجمالي التحصيل.
- الرصيد المتبقي.
- صافي الربح.
- زر التحصيل.
- زر إضافة قسط.
- زر إضافة دعم.
- قائمة الأقساط.
- قائمة الدعم.
- المصروفات.
- تقرير الفترة.

زر إضافة القسط حاليًا يظهر طالما المشروع غير ملغي. لا يوجد شرط واضح يجعله يختفي عند اكتمال المشروع أو عند الانتقال إلى دعم/Features.

زر إضافة الدعم موجود كزر مالي فوري، وليس كزر إنشاء Work Request.

لا يوجد Timer Bar عالمي ولا صفحة Features ولا صفحة Tasks.

### 2.8 الاختبارات والـ Migrations

الاختبارات الحالية كلها تقريبًا Unit Tests لمساعدات منطقية، مثل:

- التواريخ.
- الفلاتر الشهرية.
- أنواع المشاريع.
- قواعد المشروع.
- تنسيق الأرقام.
- فئات المصروفات.

لا يوجد حاليًا اختبار Integration حقيقي للـ API مع MongoDB، ولا اختبار للـ Project Payout lifecycle كاملًا.

لا يوجد نظام migrations مركزي يعمل تلقائيًا عند تشغيل التطبيق. الموجود هو Scripts يدوية مثل:

- `backfill-user-id.ts`
- `migrate-project-types.ts`
- `sync-template-expense-dates.ts`

إضافة Models جديدة لا تحتاج Migration للبيانات القديمة في البداية. أما تعديل `Project.lineKind` أو إضافة روابط Features، فيجب أن يكون متوافقًا مع السجلات القديمة ولا يحذف أو يعيد احتساب أي دفعة تاريخية.

---

## 3. المشكلة الحالية والتعارضات

### 3.1 خلط Work وMoney

الدعم الحالي يعبر عن المال، بينما الاستخدام المطلوب للدعم أحيانًا يعبر عن طلب عمل.

مثال خاطئ:

```text
عمل 5 Features جديدة
لم يتم دفع أي مبلغ
استخدام Add Support
```

النتيجة الحالية: النظام يعتبر المال محصلًا.

التصحيح:

```text
إنشاء Feature
إنشاء Tasks
تسجيل الوقت
اعتماد السعر
تسجيل دفعة فقط عند استلام المال
```

### 3.2 زر إضافة القسط في المشروع المكتمل

منطقيًا، زر القسط يخص قيمة المشروع الأصلي. بعد انتهاء المشروع وانتقال العمل إلى Features أو Support Requests، ظهور الزر بجوار زر الدعم يسبب التباسًا.

التوصية:

- إخفاء زر القسط من الإجراءات الرئيسية عندما لا يوجد رصيد أصلي مستحق.
- الاحتفاظ بتاريخ الأقساط القديمة في قسم منفصل.
- السماح بإضافة قسط أصلي فقط من إجراء واضح مثل `دفعة للمشروع الأصلي`.
- استخدام زر `إضافة Feature` أو `إضافة طلب دعم` لأي عمل جديد.

### 3.3 `billingMode=retainer` يحمل أكثر من معنى

حاليًا Retainer يعني أن المشروع يستقبل دعمًا أو دفعات إضافية، ويغير طريقة حساب `pendingAmount` و`status`.

لكن Retainer لا يجب أن يكون هو الطريقة الوحيدة لتمثيل Features؛ لأن Feature قد تكون:

- مجانية.
- غير مسعرة.
- بسعر ثابت.
- بالساعة.
- مدفوعة فورًا.
- مدفوعة على مراحل.

هذه حالات مستقلة عن كون المشروع الأصلي Fixed أو Retainer.

### 3.4 غياب الدفعة المرتبطة بالـ Feature

السجل المالي الحالي مرتبط بالمشروع فقط من خلال `freelanceProjectId`. لا يوجد `featureId`.

بدون `featureId` لن نستطيع بسهولة معرفة:

- أي دفعة تخص أي Feature.
- المبلغ المتبقي على Feature معينة.
- هل Feature معينة مدفوعة بالكامل.
- عرض إجمالي الإيراد لكل Feature.

### 3.5 غياب مصدر الحقيقة للوقت

لا يوجد Timer محفوظ على الـ Backend حاليًا. أي Timer جديد يجب ألا يعتمد على عداد JavaScript في المتصفح، لأن Refresh أو إغلاق الصفحة أو انقطاع الشبكة سيؤدي إلى فقدان الوقت.

---

## 4. النموذج المقترح للمفاهيم

### 4.1 Feature

الـ Feature هي طلب عمل مستقل داخل المشروع الأصلي. يمكن أن تكون Feature أو تعديل أو Bug Fix أو Support Request.

الحقول المقترحة:

```text
Feature
├── _id
├── userId
├── freelanceProjectId
├── title
├── description
├── type
├── status: pending | in_progress | completed | cancelled
├── pricingMode: free | pricing_pending | fixed | hourly
├── hourlyRate
├── estimatedMinutes
├── approvedPrice
├── minimumPrice
├── pricingApprovedAt
├── pricingApprovedBy
├── completedAt
├── createdAt
└── updatedAt
```

القيم المهمة:

- `hourlyRate` يبدأ من 500 EGP عند إنشاء Feature، لكنه يُحفظ داخل Feature حتى لا تتغير الحسابات القديمة إذا تغير الإعداد الافتراضي لاحقًا.
- `approvedPrice` هو السعر المتفق عليه فعليًا مع العميل، وهو المصدر المالي للمبلغ المستحق.
- `calculatedCost` لا يلزم تخزينه كحقيقة مستقلة في البداية؛ يمكن حسابه من جلسات الوقت.
- Feature مجانية يكون سعرها النهائي صفرًا، لكن وقتها لا يُحذف ولا يختفي من التقارير الداخلية.

### 4.2 أنواع Features

يفضل استخدام Enum ثابت في ملف مشترك، مع Labels للترجمة:

```text
new_feature
ui_modification
backend_modification
business_logic_change
technical_support
bug_fix
```

النوع لا يحدد السعر ولا حالة الدفع. هو تصنيف للعمل فقط.

### 4.3 Task

كل Feature تحتوي على Tasks:

```text
FeatureTask
├── _id
├── userId
├── featureId
├── freelanceProjectId
├── title
├── description
├── status: pending | in_progress | completed | cancelled
├── defaultBillable
├── estimatedMinutes
├── sortOrder
├── completedAt
├── createdAt
└── updatedAt
```

`defaultBillable` يحدد القيمة الافتراضية لجلسات الوقت الجديدة، لكن الأفضل حفظ قيمة `billable` أيضًا داخل كل TimeSession حتى لا تتغير الحسابات التاريخية عند تعديل إعداد الـ Task لاحقًا.

### 4.4 TimeSession

أقترح Model منفصل لجلسات العمل، وليس Timer واحدًا داخل Task.

```text
TimeSession
├── _id
├── userId
├── featureId
├── taskId
├── status: running | paused | stopped
├── startedAt
├── activeStartedAt
├── endedAt
├── elapsedSeconds
├── billable
├── source: timer | manual
├── manualEditReason
├── createdAt
└── updatedAt
```

طريقة الحساب:

- عند Start: إنشاء Session جديدة `running` و`activeStartedAt=now`.
- عند Pause: إضافة `now-activeStartedAt` إلى `elapsedSeconds` ثم إزالة `activeStartedAt` ووضع الحالة `paused`.
- عند Resume: وضع `activeStartedAt=now` والحالة `running`.
- عند Stop: إضافة الفترة الأخيرة، وضع `endedAt=now` والحالة `stopped`.
- عند عرض Timer يعمل: `elapsedSeconds + (now-activeStartedAt)`، مع اعتبار `now` من السيرفر عند العمليات الحقيقية.

لا يجب تخزين المدة بالـ milliseconds في الحسابات المالية. استخدم Integer Seconds، ثم اعرض الساعات والدقائق في الواجهة.

### 4.5 Active Timer ومنع تشغيل Timerين

لا نحتاج بالضرورة إلى Model منفصل باسم ActiveTimer. يمكن استخدام TimeSession نفسها مع Partial Unique Index:

```text
unique { userId } where status = running
```

هذا يضمن على مستوى قاعدة البيانات عدم وجود أكثر من Timer شغال للمستخدم نفسه، حتى لو أرسل المستخدم طلبين متزامنين.

يجب أيضًا أن يفحص الـ Service وجود Session شغالة قبل Start، ويعيد خطأ واضحًا مع اسم الـ Task الحالية.

### 4.6 Audit Log

لا يوجد Audit Log مناسب حاليًا. الإشعارات ليست بديلًا لأنها لا تحفظ Before/After بشكل موثوق.

أقترح Model عام:

```text
AuditLog
├── _id
├── userId
├── entityType: feature | task | time_session | payment
├── entityId
├── action: created | updated | manual_time_edit | deleted | started | paused | resumed | stopped
├── before
├── after
├── reason
├── createdAt
└── metadata
```

في المرحلة الأولى يمكن استخدام AuditLog لجلسات الوقت المعدلة يدويًا فقط، ثم توسيعه لاحقًا.

---

## 5. دورة التسعير

### 5.1 القاعدة الأساسية

```text
Calculated Cost = Billable Seconds / 3600 × Hourly Rate
```

مع تقريب مالي في النهاية، وليس تقريب كل Session منفردة.

### 5.2 الفصل بين القيم

يجب عرض وحساب القيم التالية كقيم مستقلة:

- `trackedSeconds`: كل وقت العمل.
- `billableSeconds`: الوقت القابل للفوترة.
- `calculatedCost`: قيمة الوقت القابل للفوترة.
- `approvedPrice`: السعر النهائي المتفق عليه.
- `collectedAmount`: ما تم تحصيله فعلًا.
- `outstandingAmount`: السعر المعتمد ناقص المدفوعات المحصلة.

لا يجوز اعتبار `calculatedCost` دخلًا أو مبلغًا مستحقًا تلقائيًا قبل اعتماد التسعير.

### 5.3 سيناريوهات التسعير

#### Feature مجانية

- `pricingMode=free`.
- السعر المعتمد صفر.
- لا توجد دفعات.
- الوقت يظهر في التقارير الداخلية.
- لا تدخل أي قيمة في دخل أو Wallet.

#### Feature غير مسعرة

- `pricingMode=pricing_pending`.
- يمكن تشغيل Timer وإنهاء Tasks.
- يعرض النظام التكلفة المحسوبة داخليًا.
- `approvedPrice=null`.
- لا توجد مستحقات مالية رسمية ولا دخل.

#### Feature بسعر ثابت

- `pricingMode=fixed`.
- يتم إدخال `approvedPrice` يدويًا.
- الوقت يظل مسجلًا للمقارنة والتحليل.
- السعر المعتمد لا يتغير تلقائيًا إذا تغير الوقت.

#### Feature بالساعة

- `pricingMode=hourly`.
- `hourlyRate` يبدأ من 500.
- التكلفة تحسب من `billableSeconds`.
- عند اعتماد السعر، الأفضل حفظ `approvedPrice` كلقطة ثابتة حتى لا تتغير قيمة المستحقات القديمة بسبب إضافة وقت لاحق.

#### الحد الأدنى

- `minimumPrice` اختياري.
- لا يُفرض على Feature مجانية.
- إذا كانت التكلفة أقل من الحد، تظهر رسالة تحذير فقط أو يُطبق الحد بناءً على اختيار المستخدم.
- يجب ألا يغير النظام السعر بدون تأكيد صريح.

### 5.4 تغيير سعر الساعة

سعر الساعة الافتراضي 500 يجب أن يكون Default عند إنشاء Feature فقط.

لا يجب تغيير الحسابات القديمة عند تغيير السعر الافتراضي. كل Feature تحفظ السعر المستخدم معها.

في البداية يمكن وضع:

```text
DEFAULT_FEATURE_HOURLY_RATE = 500
```

في ملف مشترك. إضافة إعداد عام للمستخدم يمكن أن تكون مرحلة لاحقة إذا احتجناها.

---

## 6. تصميم المدفوعات مع النظام المالي الحالي

### 6.1 التوصية الأساسية

لا ننشئ Model مالي جديد باسم FeaturePayment في البداية. الأفضل إعادة استخدام `Project` لأنه بالفعل مصدر دخل المشاريع والـ Wallet والتقارير.

نوسع السجل الحالي بإضافة:

```text
lineKind: installment | support | feature
featureId?: ObjectId | null
```

مع الحفاظ على السجلات القديمة كما هي.

الدفع الخاص بالـ Feature يكون:

```text
Project
├── userId
├── freelanceProjectId
├── featureId
├── lineKind = feature
├── amount
├── isCollected
├── collectedAt
├── date
├── paymentMethod
└── note
```

### 6.2 معنى السجل المالي

- إنشاء Feature لا ينشئ `Project` تلقائيًا.
- اعتماد سعر Feature لا ينشئ دخلًا.
- إنشاء قسط مستقبلي للـ Feature ينشئ `Project` بـ `isCollected=false`.
- تسجيل دفعة فعلية ينشئ أو يحول `Project` إلى `isCollected=true`.
- فقط السجلات المحصلة تدخل التقارير والـ Wallet.

### 6.3 فصل دفعات المشروع الأصلي عن دفعات الـ Feature

نستخدم:

- `lineKind=installment` بدون `featureId` للمشروع الأصلي.
- `lineKind=feature` مع `featureId` للـ Features.
- `lineKind=support` للسجلات القديمة التي أنشأها زر الدعم السابق.

هذا يحافظ على التاريخ ويمنع اعتبار Feature Payment قسطًا للمشروع الأصلي.

### 6.4 حالة الدفع للـ Feature

يفضل عدم تخزين `paymentStatus` كمصدر مستقل إذا كان يمكن اشتقاقه من السعر والدفعات، لتجنب التناقض.

تكون القاعدة:

```text
free → not_applicable
approvedPrice is null → pricing_pending
collected = 0 → unpaid
0 < collected < approvedPrice → partial
collected >= approvedPrice → paid
```

أي تجاوز في التحصيل يجب رفضه أو السماح به فقط بإجراء واضح اسمه Overpayment/Extra Payment.

### 6.5 تعديل أو حذف الدفعات

يجب أن يكون تعديل أو حذف Feature Payment عبر API مخصص يتحقق من:

- ملكية المستخدم للمشروع والـ Feature والدفعة.
- أن الدفعة مرتبطة بالـ Feature الصحيحة.
- عدم إنشاء رصيد سالب.
- إعادة حساب حالة الدفع.
- تحديث الـ Wallet والتقارير عبر React Query invalidation.
- تسجيل Audit Log عند التعديل اليدوي أو الحذف.

لا يجب حذف الدفعة من الواجهة فقط أو تعديلها مباشرة بدون تحديث كل الملخصات.

---

## 7. معالجة زرار القسط وزرار الدعم

### 7.1 زر القسط

التوصية في الواجهة:

- يظهر زر `إضافة قسط للمشروع الأصلي` فقط إذا كان للمشروع الأصلي رصيد أو خطة تحصيل مفتوحة.
- إذا كان `workPhase=delivered` و`billingMode=fixed` ولا يوجد رصيد، لا يظهر كإجراء أساسي.
- يتم إبقاء تاريخ الأقساط القديمة للقراءة.
- إذا احتاج المستخدم دفعًا جديدًا لطلب عمل، يستخدم Feature Payment وليس قسط المشروع.

في الـ Backend:

- الحفاظ على API القديم للتوافق.
- إضافة تحقق يمنع إنشاء قسط أصلي بعد إغلاق المشروع، إلا إذا أرسل المستخدم صراحةً نوع العملية الأصلي.
- لا نعتمد على إخفاء الزر كحماية وحيدة.

### 7.2 زر الدعم

الأفضل إعادة تسمية زر الدعم الحالي أو تقسيمه:

- `إضافة Feature / طلب دعم`: ينشئ Work Request فقط.
- `تسجيل تحصيل دعم قديم`: يبقى للسجلات الفورية القديمة عند الحاجة.

للاستخدام الجديد، زر Feature يبدأ بـ:

```text
Feature type = technical_support
pricingMode = pricing_pending أو hourly
payment = لا يوجد
```

إذا استلمت المال فورًا، ينشأ Feature ثم تسجل Payment محصلة فورًا. إذا لم تستلم المال، لا ينشأ أي دخل.

### 7.3 المشروع الذي انتهى ويعمل بنظام الدعم

المشروع الأصلي يظل موجودًا، لكن Features تكون طبقة عمل مستقلة داخله.

الواجهة المقترحة:

```text
Project Details
├── Original project summary
├── Original installments
├── Features / Support Requests
│   ├── New Feature
│   ├── In Progress
│   ├── Completed
│   └── Payment status
├── Legacy support payments
├── Expenses
└── Reports
```

لا يجب جعل `billingMode=retainer` هو الواجهة الوحيدة لمعرفة أن المشروع يستقبل Features.

---

## 8. الـ API والـ Services المقترحة

### 8.1 Feature APIs

يمكن استخدام Route Handlers جديدة:

```text
GET  /api/project-jobs/:projectId/features
POST /api/project-jobs/:projectId/features
GET  /api/features/:featureId
PUT  /api/features/:featureId
DELETE /api/features/:featureId
```

كل Route يتحقق من ملكية المستخدم للمشروع والـ Feature.

العمليات الأساسية:

- إنشاء Feature بدون سعر.
- تعديل العنوان والوصف والنوع والحالة.
- تحديد السعر أو تغيير طريقة التسعير.
- اعتماد السعر.
- إلغاء Feature مع الحفاظ على الوقت والتاريخ.
- حذف Feature فقط إذا لم توجد دفعات مالية، أو تحويل الحذف إلى Archive.

### 8.2 Task APIs

```text
GET  /api/features/:featureId/tasks
POST /api/features/:featureId/tasks
PUT  /api/tasks/:taskId
DELETE /api/tasks/:taskId
```

لا يجب السماح بحذف Task لها Sessions بدون تحذير. الأفضل Archive أو Cancel مع الاحتفاظ بالوقت.

### 8.3 Timer APIs

يفضل أن تكون العمليات Actions واضحة على Session/Task:

```text
GET  /api/time-tracking/active
POST /api/tasks/:taskId/timer/start
POST /api/time-sessions/:sessionId/pause
POST /api/time-sessions/:sessionId/resume
POST /api/time-sessions/:sessionId/stop
PUT  /api/time-sessions/:sessionId/manual
GET  /api/tasks/:taskId/time-sessions
```

الـ API لا يعتمد على elapsed time يرسله المتصفح عند Stop. السيرفر يحسب المدة من timestamps.

### 8.4 Payment APIs

```text
GET  /api/features/:featureId/payments
POST /api/features/:featureId/payments
PUT  /api/feature-payments/:paymentId
DELETE /api/feature-payments/:paymentId
POST /api/feature-payments/:paymentId/collect
```

في التنفيذ الفعلي يمكن أن تعيد استخدام `/api/project-jobs/:id` بأفعال إضافية، لكن فصل Feature Payments في Service واضح أفضل من زيادة عدد Actions داخل Route المشروع الضخم.

### 8.5 Services المقترحة

```text
src/lib/services/feature-service.ts
src/lib/services/task-service.ts
src/lib/services/time-tracking-service.ts
src/lib/services/feature-pricing-service.ts
src/lib/services/feature-payment-service.ts
src/lib/services/audit-log-service.ts
```

الخدمات يجب أن تحتوي على قواعد العمل. Route Handler يكون مسؤولًا عن auth وparsing وHTTP فقط.

---

## 9. تصميم الـ Timer بالتفصيل

### 9.1 State Machine

```text
(no session)
   │ Start
   ▼
Running ── Pause ──► Paused ── Resume ──► Running
   │                                      │
   └──────────── Stop ◄───────────────────┘
                    ▼
                 Stopped
```

القواعد:

- لا يمكن Pause Session ليست Running.
- لا يمكن Resume Session ليست Paused.
- لا يمكن Stop Session Stopped.
- لا يمكن تشغيل Timer آخر للمستخدم أثناء Running.
- بعد Stop لا يتم تغيير المدة إلا من Manual Edit مع Audit Log.

### 9.2 Refresh وإغلاق المتصفح

عند Refresh:

1. الواجهة تطلب `/api/time-tracking/active`.
2. السيرفر يعيد الـ Session الشغالة.
3. الواجهة تعرض الوقت المحسوب من السيرفر.

عند إغلاق المتصفح، لا تختفي Session؛ تظل Running حتى Pause/Stop. يجب عرض تنبيه عند العودة إذا كان Timer ما زال شغالًا.

قرار يحتاج تأكيدًا لاحقًا: هل نريد Auto-stop بعد عدد ساعات محدد أم نتركها Running حتى يتدخل المستخدم؟ التوصية الأولى: لا Auto-stop في المرحلة الأولى حتى لا نخسر وقتًا، مع تحذير واضح.

### 9.3 انقطاع الشبكة وتكرار الطلبات

- كل Mutation يجب أن تحمل `requestId` أو `idempotencyKey` عند الحاجة.
- Start المتكرر يجب ألا ينشئ جلستين.
- Pause/Stop المتكرر يجب أن يعيد الحالة الحالية بدون إضافة المدة مرتين.
- Unique partial index هو خط الدفاع الأساسي ضد Timerين شغالين.
- يفضل استخدام شروط atomic في `findOneAndUpdate` مثل `status=running`.

### 9.4 التعديل اليدوي

يوجد مساران آمنان:

1. تعديل `durationSeconds` مع سبب.
2. تعديل `startedAt` و`endedAt` مع إعادة حساب المدة.

يجب رفض:

- مدة سالبة.
- نهاية قبل البداية.
- Session يدوية تتداخل مع Session أخرى إذا قررنا منع التداخل.

كل تعديل يسجل Before/After وReason في AuditLog.

### 9.5 UI العالمي

بما أن التنقل بين الصفحات لا يجب أن يوقف Timer:

- إضافة `GlobalTimerBar` داخل Dashboard Layout.
- يظهر Task الحالية والوقت والحالة.
- أزرار Pause/Resume/Stop من أي صفحة.
- React Query يعيد جلب active timer بعد تسجيل الدخول وبعد Refresh.
- تحديث الرقم محليًا كل ثانية للعرض فقط، بينما الحقيقة تأتي من السيرفر.

---

## 10. تأثير التغيير على التقارير والأرصدة

### 10.1 ما يجب أن يظل بدون تغيير

الآتي يجب أن يستمر كما هو:

- Project Payments القديمة.
- Original Installments.
- Legacy Support Payments.
- Monthly income.
- All-time ledger.
- Wallet cash/card.
- المصاريف الحالية.

### 10.2 ما يجب تغييره

#### `ProjectPeriodReport`

إضافة تقسيم واضح:

- Original installments.
- Feature payments.
- Legacy support.
- Costs.

#### `build-monthly-report.ts`

لا تحتاج Feature غير المدفوعة إلى أي تأثير، لأنها لا توجد في `Project` المحصل.

عند إضافة Feature Payment محصلة، ستدخل تلقائيًا في دخل المشاريع والـ Wallet إذا استُخدم `Project` مع `isCollected=true`.

يفضل إضافة metadata للتقرير حتى يعرف المستخدم أن الدفعة Feature Payment، بدل ظهورها كدفعة مشروع عامة.

#### `build-ledger-report.ts`

يظل يجمع الدفعات المحصلة، لكن يجب إتاحة breakdown:

```text
projectIncome
├── originalInstallments
├── featurePayments
└── legacySupport
```

#### `wallet-service.ts`

لا يحتاج منطقًا ماليًا جديدًا إذا بقيت الدفعات في `Project`، لأن الـ Wallet يجمع الصفوف المحصلة حسب `paymentMethod`.

المطلوب هو اختبارات Regression تثبت أن:

- Feature بدون Payment لا تغير الـ Wallet.
- Feature بقسط Pending لا تغير الـ Wallet.
- Feature Payment محصلة تزيد الرصيد مرة واحدة.
- تعديل الدفعة يغير الفرق فقط.
- حذف الدفعة يعكس نفس القيمة.

### 10.3 مؤشرات لا تدخل في الدخل

هذه المؤشرات داخلية وليست دخلًا:

- Tracked Time.
- Billable Time.
- Calculated Cost.
- Target monthly revenue.
- قيمة Feature غير المعتمدة.

يجب عدم إدخالها في `Income` أو `Project` إلا عندما تكون دفعة مالية فعلية أو مبلغًا مستحقًا ممثلًا بصف Pending منفصل.

---

## 11. Dashboard وReports الجديدة

### 11.1 ملخص Feature داخل تفاصيل المشروع

في صفحة تفاصيل المشروع نضيف Card أو Section تعرض:

- عدد الـ Features.
- عدد Features قيد التنفيذ.
- عدد Features المكتملة.
- الوقت الكلي.
- الوقت القابل للفوترة.
- التكلفة المحسوبة.
- السعر المعتمد.
- المحصل.
- المتبقي.

### 11.2 Feature Details

صفحة أو Sheet لتفاصيل Feature تعرض:

- بيانات الطلب.
- الحالة.
- التسعير.
- Tasks.
- Timer الحالي.
- جلسات الوقت.
- ملخص السعر.
- Payments.

### 11.3 Dashboard الوقت

يجب توفير فلترة حسب:

- اليوم.
- الشهر.
- المشروع.
- Feature.
- Task.
- Billable / Non-Billable.

### 11.4 مؤشرات مستهدفة

المؤشرات مثل:

- 7 ساعات يوميًا.
- 20 يوم عمل.
- 140 ساعة شهريًا.
- 70,000 EGP شهريًا عند 500 EGP/ساعة.

هي Target Metrics وليست إيرادًا محققًا.

يجب عرضها بصياغة منفصلة:

```text
Target: 70,000 EGP
Actual collected: 18,000 EGP
Calculated billable value: 24,500 EGP
```

---

## 12. Database Indexes المقترحة

### Feature

```text
{ userId: 1, freelanceProjectId: 1, createdAt: -1 }
{ userId: 1, status: 1, createdAt: -1 }
{ userId: 1, pricingMode: 1, createdAt: -1 }
```

### FeatureTask

```text
{ userId: 1, featureId: 1, sortOrder: 1 }
{ userId: 1, status: 1, updatedAt: -1 }
```

### TimeSession

```text
{ userId: 1, featureId: 1, taskId: 1, startedAt: -1 }
{ userId: 1, status: 1, updatedAt: -1 }
unique partial { userId: 1 } where status = running
```

### AuditLog

```text
{ userId: 1, entityType: 1, entityId: 1, createdAt: -1 }
```

### Project

إضافة Index اختياري:

```text
{ userId: 1, featureId: 1, isCollected: 1, date: -1 }
```

مع إضافة `featureId` اختياريًا وعدم المساس بالسجلات القديمة.

---

## 13. Migration Strategy

### 13.1 لا Migration مدمرة

- لا نحذف أي `Project` قديم.
- لا نعيد تفسير `lineKind=support` القديم تلقائيًا.
- لا نغير مبالغ المشاريع القديمة.
- لا نعيد تشغيل التقارير التاريخية على Model جديد.

### 13.2 التوافق مع Project القديم

نضيف:

```text
featureId: null
```

اختياريًا إلى Schema، وتظل المستندات القديمة صالحة.

نوسع Enum `lineKind` ليقبل `feature`، مع إبقاء `support` و`installment`.

### 13.3 Legacy Support

يوجد قرار يحتاج موافقة:

#### الخيار الموصى به

نترك سجلات الدعم القديمة كما هي، ونعرضها في قسم `Legacy support payments`. Features الجديدة تستخدم Model Feature جديد.

الميزة: أقل مخاطرة ولا يوجد احتمال تكرار دخل أو ربط خاطئ.

#### خيار بديل

إنشاء Feature تاريخية لكل سجل دعم قديم وربط الدفعة بها.

هذا يحتاج Migration دقيقة، وقد يغير شكل التقارير أو يخلق Feature غير دقيقة من حيث الوصف والوقت. لا أوصي به قبل وجود موافقة واضحة.

---

## 14. خطة التنفيذ المرحلية

### المرحلة 0: تثبيت قواعد المال

قبل إضافة UI كبير:

1. تعريف معنى Original Project Payment وFeature Payment.
2. توثيق أن Feature لا تنشئ دخلًا تلقائيًا.
3. تعديل أسماء الأفعال الحالية أو إبقاء API القديم للتوافق.
4. إضافة اختبارات تمنع تسجيل دعم غير محصل كمبلغ محصل.

**اختبار الخروج:** إنشاء Feature تجريبية لا يغير التقرير أو Wallet.

### المرحلة 1: Models وTypes

1. إضافة Feature Model.
2. إضافة FeatureTask Model.
3. إضافة TimeSession Model.
4. إضافة AuditLog Model.
5. تحديث `Project` ليقبل `featureId` و`lineKind=feature`.
6. إضافة Types مشتركة.
7. إضافة Enums وLabels للترجمة.
8. إضافة Indexes.

**اختبار الخروج:** TypeScript وMongoose schema tests وindex review.

### المرحلة 2: Feature CRUD

1. إنشاء Feature بدون سعر.
2. تعديل العنوان والوصف والنوع والحالة.
3. Archive/Cancel بدل الحذف إذا كانت هناك Tasks أو Payments.
4. عرض Features داخل صفحة المشروع.
5. ربط كل Feature بالمشروع والمستخدم.

**اختبار الخروج:** Feature لا تغير دخل المشروع ولا الـ Wallet.

### المرحلة 3: Tasks

1. إضافة وتعديل وترتيب Tasks.
2. تغيير حالة Task.
3. تحديد Default Billable.
4. منع حذف Task لها وقت أو تحويلها إلى Cancelled.

**اختبار الخروج:** كل Task لا يمكن الوصول إليها عبر مشروع مستخدم آخر.

### المرحلة 4: Timer Backend

1. Start/Pause/Resume/Stop.
2. حساب المدة من Server timestamps.
3. Partial Unique Index للـ Running Timer.
4. Active Timer endpoint.
5. Idempotency والـ atomic updates.
6. Manual edit وAudit Log.

**اختبار الخروج:** Refresh وإغلاق المتصفح لا يفقدان Session، ولا يوجد Timerان Running للمستخدم.

### المرحلة 5: Timer UI

1. Timer controls داخل Task.
2. Global Timer Bar داخل Dashboard Layout.
3. Active Timer بعد Refresh.
4. حالات Loading وError وConflict.
5. استمرار Timer أثناء الانتقال بين الصفحات.

**اختبار الخروج:** تشغيل Timer من صفحة ثم الانتقال لصفحة أخرى ثم Pause/Stop بنجاح.

### المرحلة 6: Pricing

1. حساب Tracked/Billable Seconds.
2. إضافة Hourly Rate default 500.
3. Fixed/Hourly/Free/Pricing Pending.
4. اعتماد السعر.
5. حفظ السعر المعتمد كلقطة ثابتة.
6. عرض Calculated Cost مقابل Approved Price.

**اختبار الخروج:** تغيير السعر الافتراضي لا يغير Feature قديمة.

### المرحلة 7: Feature Payments

1. إضافة `featureId` إلى Project.
2. إنشاء Pending Feature Payment.
3. تسجيل تحصيل فعلي.
4. تعديل وحذف الدفع مع إعادة الحساب.
5. منع Overpayment أو جعله إجراءً صريحًا.
6. تحديث Wallet والتقارير.

**اختبار الخروج:** الدفعة Pending لا تغير الدخل، والمحصلة تغيره مرة واحدة فقط.

### المرحلة 8: التقارير

1. تحديث Project Period Report.
2. إضافة Feature Payment breakdown.
3. إضافة Time Dashboard.
4. إضافة مقارنة Estimated vs Actual.
5. إضافة Calculated vs Approved vs Collected.
6. إضافة Target metrics بشكل منفصل عن Actual Revenue.

**اختبار الخروج:** كل أرقام الدخل القديمة تظل كما كانت قبل إضافة Features.

### المرحلة 9: تحسين زرار القسط والدعم

1. إخفاء Add Original Installment من الإجراءات الأساسية عند إغلاق المشروع الأصلي.
2. إضافة زر New Feature / Support Request.
3. إبقاء Legacy Support للقراءة والتحرير والحذف.
4. إبقاء API القديم متوافقًا مؤقتًا.
5. إضافة رسائل توضح الفرق بين الشغل والدفع.

**اختبار الخروج:** المستخدم لا يستطيع بالخطأ تسجيل Feature غير مدفوعة كدخل محصل.

---

## 15. الاختبارات المطلوبة

### 15.1 Unit Tests

- حساب المدة من Sessions.
- Start/Pause/Resume/Stop transitions.
- منع الحالات غير الصحيحة.
- حساب Tracked Seconds.
- حساب Billable Seconds.
- حساب Calculated Cost.
- Free Feature.
- Pricing Pending.
- Approved Price مختلف عن Calculated Cost.
- Payment Status.
- Minimum price optional.

### 15.2 API/Service Tests

- عزل المستخدمين.
- منع الوصول إلى Feature في مشروع مستخدم آخر.
- منع Timerين للمستخدم نفسه.
- Stop المتكرر لا يضاعف الوقت.
- Pause المتكرر لا يضاعف الوقت.
- Manual edit يسجل Audit.
- إنشاء Feature لا يغير Project income.
- إنشاء Pending Payment لا يغير Wallet.
- تسجيل Collected Payment يغير Wallet مرة واحدة.
- تعديل Payment يغير الفرق فقط.
- حذف Payment يعكس المبلغ.

### 15.3 Financial Regression Tests

قبل وبعد إضافة Feature:

```text
monthly total income unchanged
ledger total unchanged
wallet cash unchanged
wallet card unchanged
original installment totals unchanged
legacy support totals unchanged
```

### 15.4 UI Tests

لا يوجد حاليًا Browser E2E framework في المشروع. إذا أصبح Timer جزءًا أساسيًا، يفضل إضافة Playwright أو اختبار UI مناسب للسيناريوهات الحرجة.

---

## 16. قرارات مطلوبة قبل التنفيذ

هذه نقاط لا يمكن حسمها من الكود وحده:

1. هل Feature التي لها Payments يمكن حذفها أم Archive فقط؟ التوصية: Archive.
2. هل Auto-stop للـ Timer مطلوب أم يظل Running حتى Stop صريح؟ التوصية: لا Auto-stop أولًا.
3. هل Billable يحدد على مستوى Task فقط أم يمكن تغييره لكل Session؟ التوصية: Task Default مع snapshot داخل Session.
4. هل تعديل السعر بعد اعتماد دفعات مسموح؟ التوصية: نعم فقط بتأكيد وتسجيل Audit، ولا يغير الدفعات التاريخية.
5. هل نُحوّل سجلات الدعم القديمة إلى Features؟ التوصية: لا Migration تلقائية.
6. هل Feature Payment المحصلة تظهر في قسم Feature مستقل في التقارير أم ضمن دخل المشروع مع breakdown؟ التوصية: كلاهما؛ تدخل في إجمالي المشروع وتظهر بتفصيل Feature.
7. هل المشروع Retainer سيظل موجودًا للـ Legacy behavior؟ التوصية: نعم مؤقتًا، لكن Features الجديدة لا تعتمد عليه.
8. هل السماح بالـ Feature Payment قبل إكمال Feature مطلوب؟ التوصية: نعم، إذا كان السعر معتمدًا، مع بقاء حالة التنفيذ منفصلة عن حالة الدفع.

---

## 17. Architecture النهائية المقترحة

```text
FreelanceProject
├── Original Project Payments
│   └── Project documents with lineKind=installment
│
├── Legacy Support Payments
│   └── Project documents with lineKind=support
│
└── Features
    ├── Feature
    │   ├── FeatureTask
    │   │   └── TimeSession[]
    │   └── Project payments with lineKind=feature and featureId
    └── Pricing / Payment summary
```

القواعد النهائية:

- Feature = عمل.
- Task = جزء من العمل.
- TimeSession = وقت فعلي.
- Calculated Cost = قيمة داخلية محسوبة.
- Approved Price = السعر المتفق عليه.
- Project Payment = حركة مالية.
- `isCollected=true` فقط عند استلام المال فعلًا.
- التقارير والـ Wallet تعتمد على الدفعات المحصلة، لا على الوقت أو التسعير المتوقع.

---

## 18. الخلاصة والتوصية النهائية

المطلوب ليس إعادة بناء نظام المشاريع أو إنشاء نظام مالي منفصل. أفضل حل هو:

1. الإبقاء على `FreelanceProject` للمشروع الأصلي.
2. الإبقاء على `Project` كمصدر الدخل والـ Wallet.
3. إضافة Models مستقلة للـ Feature وTask وTimeSession وAuditLog.
4. إضافة `featureId` و`lineKind=feature` إلى سجلات Project المالية.
5. اعتبار الدعم الجديد Feature من نوع `technical_support` بدل تسجيله كدخل فورًا.
6. إبقاء الدعم القديم متوافقًا دون Migration مدمرة.
7. إخفاء قسط المشروع الأصلي عندما يغلق المشروع، وإظهار Feature Payments بدلًا منه.
8. تنفيذ Timer من الـ Backend باستخدام timestamps وPartial Unique Index.
9. فصل Calculated Cost عن Approved Price وعن Collected Amount.
10. تنفيذ العمل على مراحل مع اختبارات Financial Regression قبل توسيع التقارير.

لا يبدأ تنفيذ الكود قبل اعتماد القرارات الموجودة في القسم 16، خصوصًا قرار الـ Legacy Support، والـ Auto-stop، وسياسة حذف Feature لها دفعات.

---

## 19. مراجعة الاعتماد النهائي والتعارضات الحرجة المتبقية

تمت مراجعة القرارات المعتمدة على الكود الحالي مرة أخرى. الـ Architecture العامة صحيحة، لكن يوجد عدد من التعارضات يجب حلها قبل إنشاء أول Feature Payment أو أول Timer.

### 19.1 التعارض الأكبر: `lineKind != support` لا يعني دفعة أصلية

عدة استعلامات حالية تعتبر كل صف ليس `support` دفعة للمشروع الأصلي. هذا صحيح قبل إضافة Features، لكنه سيصبح خطأ فور إضافة `lineKind=feature`.

النقاط المتأثرة تشمل:

- `syncJobStatus` داخل `src/lib/services/freelance-project-service.ts`.
- `sumCollected` داخل `src/lib/services/project-payout-service.ts`.
- `normalizePendingInstallments`.
- `remainingBalanceForJob`.
- `collectProjectPayment`.
- Aggregations الخاصة بقائمة المشاريع وملخصاتها.
- `getNormalProjectsSummary`.
- `client-service.ts`.
- `project-attention-service.ts`.
- `freelance-kpi-service.ts`.
- `forecast-service.ts` عند الحاجة إلى التفريق بين نوع الإيراد التاريخي.
- صفحة تفاصيل المشروع وتقريرها، لأن الواجهة الحالية تعتبر كل ما ليس Support قسطًا.

يجب إنشاء قاعدة مشتركة باسم واضح، مثل:

```text
Original project payment
= lineKind=installment
  OR legacy row with no lineKind
```

ويجب ألا نستخدم `lineKind: { $ne: "support" }` لحساب المتبقي بعد إضافة Feature Payments.

### 19.2 `syncJobStatus` يجب أن يعتمد على المشروع الأصلي فقط

الكود الحالي يجمع كل `Project` المحصل المرتبط بالمشروع، ثم يمرر الناتج إلى:

- `derivePaymentStatus`.
- `effectiveWorkPhase`.

بعد إضافة Feature Payments، هذا سيؤدي إلى احتمالات خاطئة:

- Feature Payment قد تجعل المشروع الأصلي يبدو مكتمل التحصيل.
- Feature Payment قد تجعل `workPhase` يتغير بطريقة غير مقصودة.
- في Fixed Project قد يتجاوز collected قيمة agreedAmount بسبب Features.

القاعدة المعتمدة:

```text
syncJobStatus uses originalCollectedAmount only.
Feature revenue never changes original project status.
Feature revenue never reduces original pending installments.
```

في Retainer، يظل السلوك القديم محفوظًا للمشروع الأصلي، لكن Feature Payments الجديدة لا تدخل في هذا الحساب.

### 19.3 `collectProjectPayment` قد يلتقط Feature Pending بالخطأ

المسار الحالي عند تنفيذ `collect` بدون `payoutId` يبحث عن أول `Project` بـ `isCollected=false` داخل المشروع، بدون تقييد صريح بـ `lineKind`.

بعد إضافة Feature Payments Pending، قد يضغط المستخدم زر تحصيل المشروع الأصلي فيقوم النظام بتحصيل دفعة Feature بدل القسط الأصلي.

الحل الإلزامي:

- `collectProjectPayment` للمشروع الأصلي يقرأ Original Project Payments فقط.
- `collectFeaturePayment` يقرأ Feature Payments المرتبطة بـ `featureId` فقط.
- `payoutId` يجب أن يتحقق من النوع المتوقع، وليس من ملكية الصف فقط.
- واجهة المشروع الأصلي لا تعرض Feature Pending داخل قائمة الأقساط الأصلية.

### 19.4 `collectedAmount` يحتاج تعريفًا صريحًا

حاليًا `buildProjectJobDto` يجمع كل الدفعات المحصلة، بما فيها الدعم. وبعد إضافة Feature Payments قد يصبح `collectedAmount` أكبر من `agreedAmount`، وهذا قد يكسر progress bars أو يعرض نسبة تحصيل غير منطقية.

يجب عدم تغيير المعنى القديم بشكل صامت. التوصية:

إضافة حقول منفصلة:

```text
originalCollectedAmount
featureCollectedAmount
legacySupportCollectedAmount
totalCollectedRevenue
originalPendingAmount
featureOutstandingAmount
```

ثم:

- `status` و`workPhase` وProgress الأصلي يستخدمون `originalCollectedAmount`.
- Net revenue وتقارير الدخل يمكنها استخدام `totalCollectedRevenue`.
- الواجهة تعرض الرقم المناسب بعنوان واضح بدل استخدام كلمة Collected واحدة لكل شيء.

إذا كان الحفاظ على DTO الحالي ضروريًا، يمكن إبقاء `collectedAmount` كإجمالي الإيراد المحصل للتوافق، مع إضافة `originalCollectedAmount` واستخدامه في كل حساب للمشروع الأصلي. يجب توثيق هذا حتى لا يعاد استخدام الحقل الخطأ لاحقًا.

### 19.5 `billingMode=retainer` لا يجب أن يكون Feature Mode

الكود الحالي يغير `billingMode` إلى `retainer` عند `add_support`. هذا سلوك تاريخي يجب الحفاظ عليه للسجلات القديمة، لكنه لا يجب أن يحدث عند إنشاء Feature جديدة.

في التنفيذ الجديد:

- إنشاء Feature لا يغير `billingMode`.
- Feature Payment لا يغير `billingMode`.
- Retainer يبقى تفسيرًا للمشروع الأصلي أو Legacy Support فقط.
- Feature لها دورة عمل وتسعير ودفع مستقلة.

لا ننفذ Migration تلقائية لتحويل Retainer قديم إلى Feature.

### 19.6 التقارير لها قاعدتان مختلفتان ويجب عدم خلطهما

هناك نوعان من الحسابات:

#### Cashflow / Revenue

يجب أن تشمل كل الدفعات المحصلة فعليًا:

- Original installments.
- Legacy support.
- Feature payments.

وهذا مناسب لـ:

- Wallet.
- Monthly income.
- Ledger.
- Yearly report.

#### Original project liability

يجب أن تشمل دفعات المشروع الأصلي فقط:

- Progress.
- Original pending amount.
- Original payment status.
- Collection attention للمشروع الأصلي.
- Client pending balance للمشروع الأصلي.

الفصل بين الفلترين يجب أن يكون واضحًا في Service مشترك، وليس نسخ شروط MongoDB في كل ملف.

### 19.7 Currency: النظام الحالي يستخدم EGP كعملة دفترية

`FreelanceProject.agreedAmount` محفوظ في EGP، حتى عندما تكون العملة الأصلية للمشروع SAR. `resolveProjectMoney` يحفظ:

- `originalAmount`.
- `currency`.
- `exchangeRateToEgp`.
- `agreedAmount` بوصفه EGP.

أما `Project.amount` فهو حاليًا مبلغ الدفتر المستخدم في التقارير والـ Wallet، ولا يحتوي على Snapshot مستقل للعملة الأصلية.

لذلك يجب اعتماد القواعد التالية للـ Features:

- كل الحسابات الداخلية والـ Wallet تظل بـ EGP.
- Default Hourly Rate هو `500 EGP/hour`، وليس 500 من عملة المشروع.
- Feature تحفظ `hourlyRateEgp` وقت الإنشاء.
- Feature تحفظ `pricingCurrency` إذا أراد المستخدم عرض السعر بعملة المشروع.
- عند اعتماد سعر بعملة غير EGP، يُحفظ `approvedPriceOriginal` و`approvedPriceEgp` و`exchangeRateToEgp` وقت الاعتماد.
- لا يعاد حساب سعر تاريخي بسعر صرف حديث.
- عند تسجيل Payment، يحفظ النظام مبلغ الدفتر EGP، ويفضل أيضًا حفظ `originalAmount` و`currency` و`exchangeRateToEgp` داخل سجل الدفعة الجديدة.

هذا يحتاج توسيعًا اختياريًا لـ `Project`:

```text
originalAmount?: number
currency?: EGP | SAR
exchangeRateToEgp?: number
```

السجلات القديمة لا تتأثر؛ `amount` القديم يظل EGP، والقيم الجديدة تستخدم Snapshot واضحًا.

### 19.8 `add_support` القديم لا يعالج العملات

الـ API الحالي للدعم يستقبل `amount` ويخزنه مباشرة في `Project`. لا يقوم بتحويل SAR إلى EGP.

هذا جزء من Legacy behavior ويجب عدم إعادة تفسير السجلات القديمة. لكن Feature Payments الجديدة يجب ألا تعيد استخدام هذا المسار، بل تستخدم Service جديدًا يحدد العملة والتحويل قبل إنشاء السجل المالي.

### 19.9 `scopeItems` ليست بديلًا عن Features

`scopeItems` داخل `FreelanceProject` جزء من Proposal/Scope للمشروع الأصلي، ولا يحتوي على:

- Tasks.
- Sessions.
- Payment ownership.
- حالة تنفيذ مستقلة.

لا نعيد استخدامه كـ Feature Model. يمكن عرضه بجوار Features فقط إذا كان مفيدًا للمقارنة بين Scope الأصلي والتعديلات الجديدة.

### 19.10 مشكلة الاستعلامات غير المصنفة

يجب مراجعة الاستعلامات التالية خلال مرحلة Financial Boundary قبل السماح بـ Feature Payments:

- `buildProjectJobDto` ونسخة list DTO.
- `aggregateFilteredTotals`.
- `getNormalProjectsSummary`.
- `monthPlByFreelanceJob`.
- `getProjectAttentionItems` و`attentionFromJobs`.
- `listClientSummaries` و`getClientDetail`.
- `getFreelanceKpis`.
- `projectPayoutLines`.
- `/api/projects/month-pl`.
- `forecast-service`.
- تقارير monthly وledger وyearly.

ليس المطلوب استبعاد Feature من كل هذه الملفات؛ المطلوب تصنيف كل واحد هل هو Cashflow أم Original Liability أم Feature Analytics، ثم استخدام الفلتر المناسب.

---

## 20. سياسة Timer المعتمدة للتنفيذ

### 20.1 حالات Session

```text
running → paused → running → stopped
running → stopped
```

- Pause وResume داخل نفس TimeSession.
- Start بعد Stop ينشئ Session جديدة.
- يمكن وجود Sessions متعددة لنفس Task.
- لا يوجد أكثر من Session واحدة Running للمستخدم.

### 20.2 التبديل بين Tasks

يحتاج النظام إلى Command صريح باسم `switch` بدل تنفيذ Pause وStart في الواجهة كسلسلتين منفصلتين.

السلوك المقترح:

1. حفظ زمن الـ Task الحالية أولًا.
2. وضع Session الحالية Paused.
3. Resume Session Paused للـ Task الجديدة إذا وجدت، وإلا إنشاء Session جديدة.
4. إذا فشل تشغيل Task الجديدة، تظل القديمة محفوظة كـ Paused ولا يضيع الوقت.

الهدف هو منع فقدان الوقت حتى في حالة فشل جزئي للشبكة.

### 20.3 Running بعد Refresh أو إغلاق المتصفح

- Session Running تظل Running في قاعدة البيانات.
- عند العودة، يطلب التطبيق Active Session من السيرفر.
- العداد المرئي يمكن تحديثه محليًا كل ثانية، لكنه لا يصبح مصدر الحقيقة.
- لا يتم Auto-stop في النسخة الأولى.
- تظهر رسالة تحذير إذا عاد المستخدم ووجد Timer قديمًا شغالًا.

### 20.4 منع التضارب

يجب الجمع بين:

- Partial Unique Index على `userId` عندما `status=running`.
- فحص Service قبل Start.
- Atomic conditional updates.
- HTTP 409 عند وجود Timer آخر.
- `requestId` أو idempotency للطلبات الحساسة.

### 20.5 التعديل اليدوي

- يسمح به على Session Paused أو Stopped، وليس Running.
- يحفظ `before` و`after` و`reason`.
- لا يعيد فتح Session Stopped تلقائيًا.
- يعاد حساب Feature totals بعد التعديل.

---

## 21. خطة التنفيذ النهائية القابلة للاختبار

### المرحلة 0: تثبيت عقد البيانات والفلترات المالية

**الهدف:** منع أي Feature جديدة من التأثير على المشروع الأصلي قبل إضافة Models أو UI.

المخرجات:

1. تعريف Types لـ `PaymentLineKind`.
2. إنشاء helper/query builder لدفعات المشروع الأصلي.
3. إنشاء helper لدفعات Feature.
4. تحديد أن legacy rows التي لا تحتوي `lineKind` تعتبر Original Installment.
5. تحديد أن `support` القديم لا يدخل Original Liability.
6. إضافة حقول DTO المنفصلة أو توثيق معنى `collectedAmount` بوضوح.

اختبارات الخروج:

- Feature-like row لا تقلل `originalPendingAmount`.
- Feature-like row لا تغير `syncJobStatus`.
- Original installment ما زال يؤثر في `agreedAmount` balance.
- Legacy support يحافظ على سلوكه التاريخي.

### المرحلة 1: توسيع Model المالي بأمان

**الهدف:** إضافة `lineKind=feature` و`featureId` بدون تغيير السجلات القديمة.

المخرجات:

1. توسيع Enum `Project.lineKind`.
2. إضافة `featureId` اختياري.
3. إضافة currency snapshot اختياري للدفعات الجديدة.
4. إضافة Index على `featureId`.
5. تحديث `ProjectJobDto` ليقبل `feature` وبيانات المصدر.

اختبارات الخروج:

- قراءة السجلات القديمة تعمل بدون Migration.
- API القديمة لا تكسر TypeScript.
- `lineKind` المفقود يظل Original Installment.

### المرحلة 2: إصلاح حدود المشروع الأصلي

**الهدف:** جعل الحسابات الحالية آمنة قبل إدخال Feature CRUD.

المخرجات:

1. تعديل `syncJobStatus` ليستخدم Original Payments فقط.
2. تعديل `sumCollected` و`remainingBalanceForJob`.
3. تعديل `normalizePendingInstallments`.
4. تعديل `collectProjectPayment` ليمنع التقاط Feature Pending.
5. تعديل list DTOs وproject summaries وattention وclient balances وKPIs.
6. تعديل Progress bars لتستخدم Original Collected.

اختبارات الخروج:

- إضافة صف Feature محصل تجريبيًا لا تغير status أو progress أو pending الأصلي.
- إضافة صف Feature Pending لا يظهر في Original Installments.
- زر تحصيل المشروع لا يحصّل Feature Payment.
- تعديل أو حذف Feature-like row لا يعيد إنشاء قسط أصلي خطأ.

### المرحلة 3: Feature Model وCRUD

**الهدف:** إنشاء وإدارة طلب العمل بدون أي حركة مالية.

المخرجات:

1. `Feature` Model.
2. Feature service وAPI.
3. حالات Pending / In Progress / Completed / Cancelled.
4. Pricing modes Free / Pricing Pending / Fixed / Hourly.
5. Archive بدل Delete عند وجود وقت أو دفعات.
6. إنشاء Feature من داخل صفحة المشروع.

اختبارات الخروج:

- إنشاء Feature لا يغير monthly report.
- إنشاء Feature لا يغير ledger.
- إنشاء Feature لا يغير wallet.
- المستخدم لا يصل إلى Feature مستخدم آخر.

### المرحلة 4: Task Model وCRUD

**الهدف:** تقسيم Feature إلى مهام قابلة للتنفيذ.

المخرجات:

1. `FeatureTask` Model.
2. إنشاء وتعديل وترتيب Tasks.
3. Default Billable.
4. حالات Task.
5. Archive/Cancel بدل حذف Task التي لها وقت.

اختبارات الخروج:

- Task لا يمكن ربطها بـ Feature من مشروع آخر.
- حذف/أرشفة Task لا يحذف Sessions التاريخية.

### المرحلة 5: TimeSession وTimer Service

**الهدف:** بناء مصدر حقيقة موثوق للوقت على السيرفر.

المخرجات:

1. `TimeSession` Model.
2. State machine.
3. Partial Unique Index للـ Running.
4. Start/Pause/Resume/Stop.
5. Switch Task command.
6. Active Timer query.
7. Manual edit وAudit Log.

اختبارات الخروج:

- Refresh لا يفقد الوقت.
- إغلاق المتصفح لا يمسح Session.
- Pause لا يحسب وقتًا إضافيًا.
- Resume لا ينشئ تداخلًا.
- Stop المتكرر لا يضاعف المدة.
- Timerان Running للمستخدم نفسه مرفوضان.
- Switch Task يحفظ الوقت القديم قبل بدء الجديد.

### المرحلة 6: Pricing Engine

**الهدف:** حساب قيمة العمل بدون اعتبارها دخلًا.

المخرجات:

1. Default hourly rate = 500 EGP.
2. Snapshot للسعر داخل Feature.
3. Tracked Time وBillable Time.
4. Calculated Cost.
5. Approved Price.
6. Optional minimum price = 1,000 EGP.
7. Free وPricing Pending.
8. Currency conversion snapshot.

اختبارات الخروج:

- تغيير Default Rate لا يغير Feature قديمة.
- Free Feature لها وقت وتكلفة داخلية لكن لا دخل.
- Calculated Cost لا يساوي Approved Price بالضرورة.
- FX rate قديم لا يتغير بسعر حديث.

### المرحلة 7: Feature Payments

**الهدف:** ربط Feature بالنظام المالي الحالي بدون إنشاء Ledger موازٍ.

المخرجات:

1. `featureId` داخل Project payment.
2. Feature Payment Pending.
3. Feature Payment Collected.
4. Feature Payment على مراحل.
5. Feature payment service منفصل عن Original Project collection.
6. Payment status مشتق من Approved Price والمدفوع.
7. تعديل وحذف/عكس الدفعات مع Audit حسب السياسة.

اختبارات الخروج:

- Feature بدون Payment لا تغير أي رقم مالي.
- Pending Payment لا تغير income أو wallet.
- Collected Payment تزيد cash/card مرة واحدة.
- تعديل Payment يغير الفرق فقط.
- حذف Payment لا يترك رصيدًا سالبًا.
- Feature Payment لا تقلل Original Pending.

### المرحلة 8: التقارير والتحليلات

**الهدف:** عرض العمل والقيمة والمال كطبقات منفصلة.

المخرجات:

1. Tracked Time report.
2. Billable Time report.
3. Calculated Cost report.
4. Approved Price report.
5. Outstanding Amount report.
6. Collected Revenue report.
7. Original installments / Feature payments / Legacy support breakdown.
8. Estimated vs Actual.
9. Target vs Actual بدون اعتبار Target دخلًا.

اختبارات الخروج:

- التقارير القديمة قبل إضافة Features تظل بنفس الأرقام.
- Feature غير مدفوعة تظهر في Work/Time، لا في Cashflow.
- Feature محصلة تظهر في Cashflow مع مصدرها الصحيح.

### المرحلة 9: تجربة الاستخدام وأزرار المشروع

**الهدف:** منع الالتباس بين قسط المشروع ودفعة Feature.

المخرجات:

1. زر `إضافة Feature / طلب دعم`.
2. إخفاء `إضافة قسط للمشروع الأصلي` عند إغلاق الرصيد الأصلي.
3. إبقاء تاريخ الأقساط القديمة.
4. إبقاء Legacy Support مع تعديل وحذف.
5. Feature page أو Sheet بها Tasks وTimer وPricing وPayments.
6. Global Timer Bar.

اختبارات الخروج:

- المستخدم يستطيع إنشاء Feature خلال خطوات قليلة.
- المستخدم يرى Timer الحالي بعد Refresh.
- المستخدم لا يسجل Feature غير مدفوعة كدخل بالخطأ.

### المرحلة 10: Regression وRollout

**الهدف:** التأكد من عدم كسر النظام الحالي.

المخرجات:

1. تشغيل كل Unit Tests الحالية.
2. إضافة Financial Regression suite.
3. اختبار بيانات قديمة تحتوي `lineKind` مفقودًا.
4. اختبار Legacy Support.
5. اختبار Fixed وRetainer.
6. اختبار EGP وSAR.
7. اختبار المستخدمين والعزل.
8. مراجعة الأداء والفهارس.
9. تشغيل Feature flag إن أمكن قبل الإطلاق الكامل.

---

## 22. قائمة قبول نهائية قبل التنفيذ أو النشر

لا تعتبر الميزة جاهزة إلا إذا تحققت كل النقاط التالية:

- إنشاء Feature لا ينشئ Project Payment تلقائيًا.
- تسجيل الوقت لا يدخل في الدخل.
- اعتماد السعر لا يدخل في الدخل.
- Feature Payment Pending لا تدخل في التقارير النقدية.
- Feature Payment Collected تدخل مرة واحدة فقط.
- Feature Payment لا تغير `agreedAmount`.
- Feature Payment لا تقلل Original Pending.
- Feature Payment لا تجعل Fixed Project Collected.
- Feature Payment لا تغير `billingMode`.
- Original Collect لا يلتقط Feature Payment.
- Feature Collect لا يلتقط Original Installment.
- Timer يعتمد على Server timestamps.
- Refresh لا يفقد Session.
- لا يوجد أكثر من Running Session للمستخدم.
- Pause/Resume/Stop idempotent.
- Manual edit له Audit Log.
- سعر 500 EGP محفوظ تاريخيًا لكل Feature.
- الحد الأدنى 1,000 اختياري وليس مفروضًا على Free.
- FX snapshots لا تتغير بعد اعتماد السعر أو تسجيل الدفع.
- السجلات التاريخية لا تحتاج تحويلًا تلقائيًا.
- كل الحسابات الأصلية القديمة لها اختبارات Regression.

## 23. القرار النهائي

الـ Architecture المعتمدة مناسبة، لكن التنفيذ يجب أن يبدأ من **Financial Boundary** قبل Feature UI أو Timer UI.

الترتيب الإلزامي هو:

```text
Financial boundaries
→ Project/Feature payment separation
→ Feature CRUD
→ Task CRUD
→ Backend Timer
→ Pricing
→ Feature Payments
→ Reports
→ Final UI polish
```

لا يبدأ تنفيذ واجهة الـ Timer أو زر Feature قبل إصلاح حدود الدفعات الأصلية، لأن أي UI مبني فوق `lineKind != support` سيخلق أخطاء مالية يصعب اكتشافها بعد وجود بيانات جديدة.







