<?php

namespace SV\NoticeTimeReplacable\XF;

class NoticeList extends XFCP_NoticeList
{
    /** @var null|int */
    protected $svNow = null;

    protected function getTokens()
    {
        $tokens = parent::getTokens();

        $tokens['{user_id}'] = $this->user->user_id;

        return $tokens;
    }

    /**
     * @param string $key
     * @param string $type
     * @param string $message
     * @param array  $override
     */
    public function addNotice($key, $type, $message, array $override = [])
    {
        parent::addNotice($key, $type, $message, $override);

        if (empty($override['page_criteria']))
        {
            return;
        }

        $tokens = [];
        foreach ($override['page_criteria'] AS $criterion)
        {
            switch ($criterion['rule'])
            {
                case 'after':
                    list($absolute, $relative) = $this->getAbsoluteRelativeTimeDiff($criterion);
                    $tokens['{time_start:absolute}'] = $absolute;
                    $tokens['{time_start:relative}'] = $relative;
                    break;
                case 'before':
                    list($absolute, $relative) = $this->getAbsoluteRelativeTimeDiff($criterion);
                    $tokens['{time_end:absolute}'] = $absolute;
                    $tokens['{time_end:relative}'] = $relative;
                    break;
            }
        }

        if ($tokens)
        {
            $message = $this->notices[$type][$key]['message'];

            $message = strtr($message, $tokens);

            $this->notices[$type][$key]['message'] = $message;
        }
    }

    /**
     * @param array $criterion
     * @return array
     */
    protected function getAbsoluteRelativeTimeDiff(array $criterion)
    {
        $ymd = $criterion['data']['ymd'];
        $timeHour = $criterion['data']['hh'];
        $timeMinute = $criterion['data']['mm'];

        if ($criterion['data']['user_tz'])
        {
            $timezone = new \DateTimeZone(\XF::visitor()->timezone);
        }
        else
        {
            $timezone = new \DateTimeZone($criterion['data']['timezone']);
        }

        $timeStamp = new \DateTime("{$ymd}T$timeHour:$timeMinute", $timezone);
        if ($this->svNow === null)
        {
            $this->svNow = new \DateTime();
        }

        $absolute = \XF::language()->dateTime($timeStamp->getTimestamp());
        $relative = $this->getRelativeDate($this->svNow, $timeStamp);

        return [$absolute, $relative];
    }

    /**
     * @param array  $format
     * @param int    $value
     * @param string $formatString
     * @param string $phrase
     */
    protected function appendDatePart(&$format, $value, $formatString, $phrase)
    {
        $value = (int)$value;
        if ($value === 1)
        {
            $format[] = \XF::phrase('time.' . $phrase, ['count' => $value]);
        }
        else if ($value > 1)
        {
            $format[] = \XF::phrase('time.' . $phrase . 's', ['count' => $value]);
        }
        else if ($value < 0)
        {
            $format[] = [$formatString, \XF::phrase($phrase)];
        }
    }

    /**
     * @param \DateTime $now
     * @param \DateTime $other
     * @return string
     */
    public function getRelativeDate(\DateTime $now, \DateTime $other)
    {
        $interval = $other->diff($now);
        if (!$interval)
        {
            return '';
        }

        $format = [];
        $this->appendDatePart($format, $interval->y, '%y ', 'year');
        $this->appendDatePart($format, $interval->m, '%m ', 'month');
        $this->appendDatePart($format, $interval->d, '%d ', 'day');
        $this->appendDatePart($format, $interval->h, '%h ', 'hour');
        $this->appendDatePart($format, $interval->i, '%i ', 'minute');
        $this->appendDatePart($format, $interval->s, '%s ', 'second');

        $secondsDiff = intval($now->getTimestamp() - $other->getTimestamp());
        if ($secondsDiff)
        {
            foreach ($format as &$time)
            {
                if (is_array($time))
                {
                    $time = join($time);
                }
            }

            $time = $interval->format(join(', ', $format));
        }
        else
        {
            $time = '0 ' . \XF::phrase('time.seconds');
        }

        $templater = $this->app->templater();
        foreach (['sv/vendor/moment/moment/moment.js', 'sv/notice-time-replacable/core.js'] AS $file)
        {
            $templater->includeJs([
                'src'   => $file,
                'addon' => 'SV/NoticeTimeReplacable',
                'min'   => '1',
            ]);
        }

        $language = \XF::language();
        return '<span class="time-notice" data-xf-init="sv-notice-time-replacable--relative-timestamp" ' .
            'data-timestamp="' . \XF::escapeString($other->getTimestamp()) . '" ' .
            'data-date-format="' . \XF::escapeString($language->date_format) . '" ' .
            'data-time-format="' . \XF::escapeString($language->time_format) . '" ' .
            'data-seconds-diff="' . \XF::escapeString($secondsDiff) . '">' . \XF::escapeString($time) . '</span>';
    }
}
