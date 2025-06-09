import Image from "next/image";

interface StoreProps {
  label: string;
  link: string;
  image: string;
  alt: string;
  size: number;
}

export const Store: React.FC<StoreProps> = ({
  label,
  link,
  image,
  alt,
  size,
}) => {
  return (
    <a className="store-icon flex flex-col items-center" href={link}>
      <Image src={image} alt={alt} height={size} width={size} />
      <div className="h-3" />
      <small className="text-sm font-medium leading-none">{label}</small>
    </a>
  );
};
