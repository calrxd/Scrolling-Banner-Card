export interface BannerItem {
  entity: string;
  label?: string;
  icon?: string;
}

export interface BannerStyle {
  background?: string;
  height?: number;
  speed?: number;
  gap?: number;
  pill_background?: string;
  text_color?: string;

  fixed?: boolean;
  top_offset?: string;
  z_index?: number;
}

export interface BannerCardConfig {
  type: string;
  items: BannerItem[];
  style?: BannerStyle;
}
