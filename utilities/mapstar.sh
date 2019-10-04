#!/bin/bash

gdalwarp \
    -co "TFW=YES" \
    -s_srs "EPSG:4326" \
    -t_srs "EPSG:3857" \
    geotiff/australia-merged-90m.tif \
    geotiff/australia-reprojected.tif

    gdalwarp \
    -cutline bbox/bbox.shp \
    -crop_to_cutline \
    -dstalpha \
    geotiff/australia-reprojected.tif \
    geotiff/australia-cropped.tif


mkdir -p tmp
gdaldem \
    hillshade \
    geotiff/australia-cropped.tif \
    tmp/hillshade.tmp.tif \
    -z 5 \
    -az 315 \
    -alt 60 \
    -compute_edges
gdal_calc.py \
    -A tmp/hillshade.tmp.tif \
    --outfile=geotiff/australia-color-crop.tif \
    --calc="255*(A>220) + A*(A<=220)"
gdal_calc.py \
    -A tmp/hillshade.tmp.tif \
    --outfile=tmp/opacity_crop.tmp.tif \
    --calc="1*(A>220) + (256-A)*(A<=220)"

