type OriginType = number | string | boolean;

type OriginArray = Array<OriginType | OriginArray | OriginObject>;

type OriginObject = {[key: string]: OriginType | OriginArray | OriginObject};

export type PrimaryType = OriginType | OriginArray | OriginObject;

export type PrimaryObject = OriginObject;