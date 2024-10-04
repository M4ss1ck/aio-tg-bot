'use client'
import Carousel from 'react-gallery-carousel';
import 'react-gallery-carousel/dist/index.css';

interface GalleryProps {
    photos: {
        src: string
        [key: string]: any
    }[];
}

export const Gallery = ({ photos }: GalleryProps) => {
    return (
        <Carousel images={photos} />
    )
}