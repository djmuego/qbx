import React from 'react';
import {
  Thermometer,
  Droplets,
  Sprout,
  Cloud,
  Sun,
  Waves,
  Activity,
  Gauge,
  HelpCircle,
  Lightbulb,
  Fan,
  Flame,
  Wind,
  Zap,
  Power,
  RotateCcw,
  Sliders,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  Trash2,
  Edit2,
  X,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  ArrowUpRight,
  ArrowDownRight,
  Moon,
  SunMedium,
  CheckCircle2,
  Clock,
  Timer,
  Layers,
  Home,
  Bot,
  Settings,
  MoreVertical,
  Maximize2,
  Info,
  RefreshCw,
  FolderPlus,
  Download,
  Upload,
  Sparkles,
  Leaf,
  Calendar,
  TrendingUp,
  TrendingDown,
  Play,
  Send,
  Map,
  LayoutGrid,
  Bluetooth,
  User,
  Menu,
  LogOut,
  Users,
  Copy,
} from 'lucide-react';
import { SensorType, EquipmentType } from '../../types';

export const SensorIcon: React.FC<{ type: SensorType; className?: string }> = ({ type, className = 'w-5 h-5' }) => {
  switch (type) {
    case 'temperature':
      return <Thermometer className={className} />;
    case 'humidity':
      return <Droplets className={className} />;
    case 'soil_moisture':
      return <Sprout className={className} />;
    case 'co2':
      return <Cloud className={className} />;
    case 'light':
      return <Sun className={className} />;
    case 'water_level':
      return <Waves className={className} />;
    case 'ph':
      return <Activity className={className} />;
    case 'ec':
      return <Zap className={className} />;
    case 'pressure':
      return <Gauge className={className} />;
    case 'other':
    case 'unused':
    default:
      return <HelpCircle className={className} />;
  }
};

export const EquipmentIcon: React.FC<{ type: EquipmentType; className?: string; isHighPower?: boolean }> = ({
  type,
  className = 'w-5 h-5',
  isHighPower = false,
}) => {
  if (isHighPower) {
    return <Zap className={className} />;
  }
  switch (type) {
    case 'lighting':
      return <Lightbulb className={className} />;
    case 'watering':
      return <Droplets className={className} />;
    case 'ventilation':
      return <Fan className={className} />;
    case 'heating':
      return <Flame className={className} />;
    case 'humidifier':
      return <Wind className={className} />;
    case 'valve':
      return <RotateCcw className={className} />;
    case 'co2':
      return <Cloud className={className} />;
    case 'socket':
      return <Power className={className} />;
    case 'other':
    case 'unused':
    default:
      return <Sliders className={className} />;
  }
};

export {
  Thermometer,
  Droplets,
  Sprout,
  Cloud,
  Sun,
  Waves,
  Activity,
  Gauge,
  HelpCircle,
  Lightbulb,
  Fan,
  Flame,
  Wind,
  Zap,
  Power,
  RotateCcw,
  Sliders,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  Trash2,
  Edit2,
  X,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  ArrowUpRight,
  ArrowDownRight,
  Moon,
  SunMedium,
  CheckCircle2,
  Clock,
  Timer,
  Layers,
  Home,
  Bot,
  Settings,
  MoreVertical,
  Maximize2,
  Info,
  RefreshCw,
  FolderPlus,
  Download,
  Upload,
  Sparkles,
  Leaf,
  Calendar,
  TrendingUp,
  TrendingDown,
  Play,
  Send,
  Map,
  LayoutGrid,
  Bluetooth,
  User,
  Menu,
  LogOut,
  Users,
  Copy,
};
