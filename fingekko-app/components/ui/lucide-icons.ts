/**
 * The lucide glyphs this app actually uses — every one, and nothing else.
 *
 * `Icon` used to reach for the package barrel (`import * as from
 * 'lucide-react-native'`), which pulls all ~1,700 icon modules into the graph.
 * Metro can't tree-shake, so every one of them went through Babel *and* the
 * React Compiler on every bundle, for all three targets (native, web, SSR) at
 * once — the ~280s bundles and the jest-worker "Data cannot be cloned, out of
 * memory" crash. Naming them explicitly cuts the module count by ~1,550.
 *
 * The `lucide-icon/*` specifier is a Metro alias for the package's per-icon
 * modules (see metro.config.js); the package's `exports` map has no subpath
 * entry, so the alias is what lets us skip the barrel. Types come from the
 * `lucide-icon/*` wildcard declaration in svg.d.ts.
 *
 * Adding an icon: add its export here (kebab-case file name), or `Icon`
 * renders nothing for it.
 */

/* Navigation & chrome */
export { default as ArrowDownLeft } from 'lucide-icon/arrow-down-left';
export { default as ArrowDownToLine } from 'lucide-icon/arrow-down-to-line';
export { default as ArrowLeft } from 'lucide-icon/arrow-left';
export { default as ArrowRight } from 'lucide-icon/arrow-right';
export { default as ArrowUpRight } from 'lucide-icon/arrow-up-right';
export { default as ChevronDown } from 'lucide-icon/chevron-down';
export { default as ChevronLeft } from 'lucide-icon/chevron-left';
export { default as ChevronRight } from 'lucide-icon/chevron-right';
export { default as Menu } from 'lucide-icon/menu';
export { default as Search } from 'lucide-icon/search';
export { default as Settings } from 'lucide-icon/settings';
export { default as LogOut } from 'lucide-icon/log-out';
export { default as RefreshCw } from 'lucide-icon/refresh-cw';
export { default as History } from 'lucide-icon/history';

/* Status & feedback */
export { default as Check } from 'lucide-icon/check';
export { default as CircleAlert } from 'lucide-icon/circle-alert';
export { default as CircleCheck } from 'lucide-icon/circle-check';
export { default as CircleSlash } from 'lucide-icon/circle-slash';
export { default as Minus } from 'lucide-icon/minus';
export { default as Plus } from 'lucide-icon/plus';
export { default as TriangleAlert } from 'lucide-icon/triangle-alert';
export { default as WifiOff } from 'lucide-icon/wifi-off';
export { default as X } from 'lucide-icon/x';

/* Money & tracking */
export { default as Banknote } from 'lucide-icon/banknote';
export { default as ChartPie } from 'lucide-icon/chart-pie';
export { default as Coins } from 'lucide-icon/coins';
export { default as CreditCard } from 'lucide-icon/credit-card';
export { default as DollarSign } from 'lucide-icon/dollar-sign';
export { default as Gauge } from 'lucide-icon/gauge';
export { default as HandCoins } from 'lucide-icon/hand-coins';
export { default as Handshake } from 'lucide-icon/handshake';
export { default as Landmark } from 'lucide-icon/landmark';
export { default as PiggyBank } from 'lucide-icon/piggy-bank';
export { default as Receipt } from 'lucide-icon/receipt';
export { default as ReceiptText } from 'lucide-icon/receipt-text';
export { default as TrendingDown } from 'lucide-icon/trending-down';
export { default as TrendingUp } from 'lucide-icon/trending-up';
export { default as Vault } from 'lucide-icon/vault';
export { default as Wallet } from 'lucide-icon/wallet';

/* Streak, quests & personality */
export { default as Brain } from 'lucide-icon/brain';
export { default as Calendar } from 'lucide-icon/calendar';
export { default as CalendarCheck } from 'lucide-icon/calendar-check';
export { default as CalendarDays } from 'lucide-icon/calendar-days';
export { default as ClipboardList } from 'lucide-icon/clipboard-list';
export { default as Clock } from 'lucide-icon/clock';
export { default as Eye } from 'lucide-icon/eye';
export { default as EyeOff } from 'lucide-icon/eye-off';
export { default as Flame } from 'lucide-icon/flame';
export { default as Moon } from 'lucide-icon/moon';
export { default as MoonStar } from 'lucide-icon/moon-star';
export { default as Ruler } from 'lucide-icon/ruler';
export { default as Shield } from 'lucide-icon/shield';
export { default as ShieldCheck } from 'lucide-icon/shield-check';
export { default as Sparkles } from 'lucide-icon/sparkles';
export { default as Star } from 'lucide-icon/star';
export { default as StickyNote } from 'lucide-icon/sticky-note';
export { default as Sunrise } from 'lucide-icon/sunrise';
export { default as Target } from 'lucide-icon/target';
export { default as Timer } from 'lucide-icon/timer';
export { default as Trophy } from 'lucide-icon/trophy';
export { default as Zap } from 'lucide-icon/zap';

/* People */
export { default as Bell } from 'lucide-icon/bell';
export { default as BellOff } from 'lucide-icon/bell-off';
export { default as Camera } from 'lucide-icon/camera';
export { default as Lock } from 'lucide-icon/lock';
export { default as Mail } from 'lucide-icon/mail';
export { default as Phone } from 'lucide-icon/phone';
export { default as User } from 'lucide-icon/user';
export { default as UserPlus } from 'lucide-icon/user-plus';
export { default as Users } from 'lucide-icon/users';

/* Editing */
export { default as Pencil } from 'lucide-icon/pencil';
export { default as Tag } from 'lucide-icon/tag';
export { default as Trash } from 'lucide-icon/trash';
export { default as Trash2 } from 'lucide-icon/trash-2';

/* Category art — food & drink */
export { default as Apple } from 'lucide-icon/apple';
export { default as Beer } from 'lucide-icon/beer';
export { default as Cake } from 'lucide-icon/cake';
export { default as ChefHat } from 'lucide-icon/chef-hat';
export { default as Coffee } from 'lucide-icon/coffee';
export { default as Cookie } from 'lucide-icon/cookie';
export { default as Croissant } from 'lucide-icon/croissant';
export { default as GlassWater } from 'lucide-icon/glass-water';
export { default as IceCreamCone } from 'lucide-icon/ice-cream-cone';
export { default as Milk } from 'lucide-icon/milk';
export { default as Pizza } from 'lucide-icon/pizza';
export { default as Popcorn } from 'lucide-icon/popcorn';
export { default as Soup } from 'lucide-icon/soup';
export { default as Utensils } from 'lucide-icon/utensils';
export { default as UtensilsCrossed } from 'lucide-icon/utensils-crossed';
export { default as Wine } from 'lucide-icon/wine';

/* Category art — travel */
export { default as Bike } from 'lucide-icon/bike';
export { default as Bus } from 'lucide-icon/bus';
export { default as Car } from 'lucide-icon/car';
export { default as CarTaxiFront } from 'lucide-icon/car-taxi-front';
export { default as Fuel } from 'lucide-icon/fuel';
export { default as MapPin } from 'lucide-icon/map-pin';
export { default as Plane } from 'lucide-icon/plane';
export { default as Ship } from 'lucide-icon/ship';
export { default as TrainFront } from 'lucide-icon/train-front';
export { default as TramFront } from 'lucide-icon/tram-front';

/* Category art — home & bills */
export { default as BedDouble } from 'lucide-icon/bed-double';
export { default as Droplet } from 'lucide-icon/droplet';
export { default as Hammer } from 'lucide-icon/hammer';
export { default as Lightbulb } from 'lucide-icon/lightbulb';
export { default as Plug } from 'lucide-icon/plug';
export { default as Sofa } from 'lucide-icon/sofa';
export { default as Wifi } from 'lucide-icon/wifi';
export { default as Wrench } from 'lucide-icon/wrench';

/* Category art — life */
export { default as Activity } from 'lucide-icon/activity';
export { default as Baby } from 'lucide-icon/baby';
export { default as Backpack } from 'lucide-icon/backpack';
export { default as BookOpen } from 'lucide-icon/book-open';
export { default as Briefcase } from 'lucide-icon/briefcase';
export { default as Building2 } from 'lucide-icon/building-2';
export { default as Cat } from 'lucide-icon/cat';
export { default as Clapperboard } from 'lucide-icon/clapperboard';
export { default as Cross } from 'lucide-icon/cross';
export { default as Dog } from 'lucide-icon/dog';
export { default as Dumbbell } from 'lucide-icon/dumbbell';
export { default as Film } from 'lucide-icon/film';
export { default as Flower } from 'lucide-icon/flower';
export { default as Footprints } from 'lucide-icon/footprints';
export { default as Gamepad2 } from 'lucide-icon/gamepad-2';
export { default as Gem } from 'lucide-icon/gem';
export { default as Gift } from 'lucide-icon/gift';
export { default as Glasses } from 'lucide-icon/glasses';
export { default as Globe } from 'lucide-icon/globe';
export { default as GraduationCap } from 'lucide-icon/graduation-cap';
export { default as Headphones } from 'lucide-icon/headphones';
export { default as Heart } from 'lucide-icon/heart';
export { default as HeartPulse } from 'lucide-icon/heart-pulse';
export { default as Laptop } from 'lucide-icon/laptop';
export { default as Leaf } from 'lucide-icon/leaf';
export { default as Music } from 'lucide-icon/music';
export { default as PartyPopper } from 'lucide-icon/party-popper';
export { default as PawPrint } from 'lucide-icon/paw-print';
export { default as Pill } from 'lucide-icon/pill';
export { default as Rocket } from 'lucide-icon/rocket';
export { default as Scissors } from 'lucide-icon/scissors';
export { default as Shirt } from 'lucide-icon/shirt';
export { default as ShoppingBag } from 'lucide-icon/shopping-bag';
export { default as ShoppingCart } from 'lucide-icon/shopping-cart';
export { default as Smartphone } from 'lucide-icon/smartphone';
export { default as Stethoscope } from 'lucide-icon/stethoscope';
export { default as Sun } from 'lucide-icon/sun';
export { default as Syringe } from 'lucide-icon/syringe';
export { default as Ticket } from 'lucide-icon/ticket';
export { default as TreePine } from 'lucide-icon/tree-pine';
export { default as Watch } from 'lucide-icon/watch';
export { default as CircleDollarSign } from 'lucide-icon/circle-dollar-sign';

/**
 * lucide v1 renamed a batch of glyphs and the barrel keeps the old names as
 * aliases. We call the icons by their v0 names in a few places, so re-export
 * the same modules under both.
 */
export { default as BarChart, default as BarChart3 } from 'lucide-icon/chart-column';
export { default as CheckCircle2 } from 'lucide-icon/circle-check';
export { default as XCircle } from 'lucide-icon/circle-x';
export { default as MoreVertical } from 'lucide-icon/ellipsis-vertical';
export { default as Home, default as House } from 'lucide-icon/house';
export { default as IceCream } from 'lucide-icon/ice-cream-cone';
