#!/bin/bash

gdalwarp \
-cutline bbox/bbox.shp \
-crop_to_cutline \
geotiff/new-test-wed-night.tif \
geotiff/new-test-wed-night-cropped.tif

gdal_translate -ot Byte -outsize 1000 1039 geotiff/new-test-wed-night-cropped.tif geotiff/australia.tif



gdal_translate [--help-general]
    [-ot {Byte/Int16/UInt16/UInt32/Int32/Float32/Float64/
            CInt16/CInt32/CFloat32/CFloat64}] [-strict]